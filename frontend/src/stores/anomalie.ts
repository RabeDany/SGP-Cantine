import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { generateId, loadFromStorage, saveToStorage } from '@/utils/helpers'
import { useStockStore } from '@/stores/stock'
import { useAuditStore } from '@/stores/audit'
import type { Anomalie, AnomalieNiveau, AnomalieStatut, AnomalieType } from '@/types/anomalie'
import type { UserRole } from '@/types'

const STORAGE_KEY = 'anomalies'

export interface EcartInventaireInput {
  denreeId: string
  nom: string
  unite: string
  stockTheorique: number
  stockPhysique: number
}

export interface ConsommationAnomalieInput {
  denreeId: string
  nom: string
  unite: string
  quantitePeriode: number
  moyenne4Semaines: number
  nbEleves: number
}

export const useAnomalieStore = defineStore('anomalie', () => {
  const anomalies = ref<Anomalie[]>(loadFromStorage<Anomalie[]>(STORAGE_KEY, []))

  function persist() {
    saveToStorage(STORAGE_KEY, anomalies.value)
  }

  function getAnomalie(id: string) {
    return anomalies.value.find((a) => a.id === id)
  }

  function logAnomalie(
    data: {
      type: AnomalieType
      niveau: AnomalieNiveau
      titre: string
      description: string
      denreeId?: string
      utilisateurId?: string
      detail?: Record<string, unknown>
    },
    user?: { id: string; nom: string; role: UserRole },
  ) {
    const anomalie: Anomalie = {
      id: generateId('an'),
      type: data.type,
      niveau: data.niveau,
      statut: 'en_cours',
      titre: data.titre,
      description: data.description,
      denreeId: data.denreeId,
      dateDetection: new Date().toISOString(),
      utilisateurId: data.utilisateurId,
      detail: data.detail,
    }
    anomalies.value.unshift(anomalie)
    persist()

    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'anomalie_detectee',
        actionLabel: 'Anomalie détectée',
        description: `Anomalie niveau ${data.niveau} : ${data.titre}`,
        module: 'anomalie',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: anomalie.id,
        targetType: 'anomalie',
        detail: JSON.stringify(data.detail ?? {}),
      })
    }
    return anomalie
  }

  function mettreAJourStatut(id: string, statut: AnomalieStatut, user?: { id: string; nom: string; role: UserRole }) {
    const anomalie = getAnomalie(id)
    if (!anomalie) return false
    anomalie.statut = statut
    persist()

    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'anomalie_statut',
        actionLabel: 'Mise à jour statut anomalie',
        description: `Statut de l'anomalie ${id} passé à « ${statut} » par ${user.nom}`,
        module: 'anomalie',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: id,
        targetType: 'anomalie',
      })
    }
    return true
  }

  /**
   * Règle §3.3 — Écart anormal entre stock théorique et stock physique lors de l'inventaire (écart > 10%).
   * Toujours niveau 2 : avertissement avec notification au directeur (pas de blocage).
   */
  function detecterEcartInventaire(
    entrees: EcartInventaireInput[],
    user?: { id: string; nom: string; role: UserRole },
  ): Anomalie[] {
    const detectees: Anomalie[] = []
    for (const entree of entrees) {
      if (entree.stockTheorique <= 0) continue
      const ecartAbs = Math.abs(entree.stockPhysique - entree.stockTheorique)
      const tauxEcart = (ecartAbs / entree.stockTheorique) * 100
      if (tauxEcart <= 10) continue

      const sens = entree.stockPhysique > entree.stockTheorique ? 'excédent' : 'manquant'
      const anomalie = logAnomalie(
        {
          type: 'ecart_inventaire',
          niveau: 2,
          titre: `Écart d'inventaire > 10% — ${entree.nom}`,
          description: `Écart de ${tauxEcart.toFixed(1)}% (${sens} de ${ecartAbs.toFixed(2)} ${entree.unite}) entre le stock théorique (${entree.stockTheorique}) et le stock physique (${entree.stockPhysique}).`,
          denreeId: entree.denreeId,
          detail: {
            stockTheorique: entree.stockTheorique,
            stockPhysique: entree.stockPhysique,
            ecartAbs,
            tauxEcart: Number(tauxEcart.toFixed(1)),
          },
        },
        user,
      )
      detectees.push(anomalie)
    }
    return detectees
  }

  /**
   * Règle §3.3 — Consommation d'une denrée supérieure à 150% de la moyenne sur les 4 dernières semaines
   * pour le même nombre d'élèves présents.
   * Niveau 2 : consommation > 150% (avertissement + notification directeur)
   */
  function detecterConsommationAnormale(
    entrees: ConsommationAnomalieInput[],
    user?: { id: string; nom: string; role: UserRole },
  ): Anomalie[] {
    const detectees: Anomalie[] = []
    for (const entree of entrees) {
      if (entree.moyenne4Semaines <= 0) continue
      const ratio = (entree.quantitePeriode / entree.moyenne4Semaines) * 100
      if (ratio <= 150) continue

      const anomalie = logAnomalie(
        {
          type: 'consommation_anormale',
          niveau: 2,
          titre: `Consommation anormale — ${entree.nom}`,
          description: `Consommation de ${entree.quantitePeriode} ${entree.unite} soit ${ratio.toFixed(0)}% de la moyenne sur 4 semaines (${entree.moyenne4Semaines} ${entree.unite}) pour ${entree.nbEleves} élèves présents.`,
          denreeId: entree.denreeId,
          detail: {
            quantitePeriode: entree.quantitePeriode,
            moyenne4Semaines: entree.moyenne4Semaines,
            ratio: Number(ratio.toFixed(0)),
            nbEleves: entree.nbEleves,
          },
        },
        user,
      )
      detectees.push(anomalie)
    }
    return detectees
  }

  /**
   * Règle métier n°10 — Une anomalie de niveau 3 bloque l'opération concernée
   * jusqu'à validation manuelle (pointage > 20 %, sortie hors 10h–14h — US-37).
   * Les écarts d'inventaire et la surconsommation restent au niveau 2 (non bloquants).
   */
  function verifierBlocage(denreeId?: string): boolean {
    return anomalies.value.some(
      (a) =>
        a.niveau === 3 &&
        a.statut === 'en_cours' &&
        (denreeId === undefined || a.denreeId === denreeId),
    )
  }

  /**
   * Détection automatique à partir des données du store stock.
   * - Écart d'inventaire : compare le stock théorique (stockActuel) au stock physique saisi.
   * - Consommation : calcule la moyenne des sorties « préparation repas » sur 4 semaines
   *   et compare à la consommation de la semaine courante.
   */
  function detecterAutomatiquement(
    inventairePhysique: Record<string, number>,
    user?: { id: string; nom: string; role: UserRole },
  ): { ecarts: Anomalie[]; consommations: Anomalie[] } {
    const stockStore = useStockStore()
    const ecarts = detecterEcartInventaire(
      stockStore.denreesAvecStatut
        .filter((d) => inventairePhysique[d.id] !== undefined)
        .map((d) => ({
          denreeId: d.id,
          nom: d.nom,
          unite: d.unite,
          stockTheorique: d.stockActuel,
          stockPhysique: inventairePhysique[d.id],
        })),
      user,
    )

    const consommations = detecterConsommationAnormale(
      stockStore.denreesAvecStatut.map((d) => {
        const sorties = stockStore.mouvements.filter(
          (m) => m.denreeId === d.id && m.type === 'sortie' && m.motif === 'preparation_repas',
        )
        const now = new Date()
        const semaineCourante = sorties.filter((m) => {
          const date = new Date(m.date)
          return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000
        })
        const quatreSemaines = sorties.filter((m) => {
          const date = new Date(m.date)
          return now.getTime() - date.getTime() <= 28 * 24 * 60 * 60 * 1000
        })
        const quantitePeriode = semaineCourante.reduce((s, m) => s + m.quantite, 0)
        const moyenne4Semaines = quatreSemaines.reduce((s, m) => s + m.quantite, 0) / 4
        return {
          denreeId: d.id,
          nom: d.nom,
          unite: d.unite,
          quantitePeriode,
          moyenne4Semaines,
          nbEleves: 0,
        }
      }),
      user,
    )

    return { ecarts, consommations }
  }

  const anomaliesActives = computed(() =>
    anomalies.value.filter((a) => a.statut === 'en_cours'),
  )

  const anomaliesNiveau3 = computed(() =>
    anomalies.value.filter((a) => a.niveau === 3 && a.statut === 'en_cours'),
  )

  const anomaliesNiveau2 = computed(() =>
    anomalies.value.filter((a) => a.niveau === 2 && a.statut === 'en_cours'),
  )

  const statsAnomalies = computed(() => ({
    total: anomalies.value.length,
    actives: anomaliesActives.value.length,
    niveau1: anomalies.value.filter((a) => a.niveau === 1).length,
    niveau2: anomalies.value.filter((a) => a.niveau === 2).length,
    niveau3: anomaliesNiveau3.value.length,
    justifiees: anomalies.value.filter((a) => a.statut === 'justifiee').length,
    nonJustifiees: anomalies.value.filter((a) => a.statut === 'non_justifiee').length,
  }))

  return {
    anomalies,
    anomaliesActives,
    anomaliesNiveau2,
    anomaliesNiveau3,
    statsAnomalies,
    getAnomalie,
    logAnomalie,
    mettreAJourStatut,
    detecterEcartInventaire,
    detecterConsommationAnormale,
    detecterAutomatiquement,
    verifierBlocage,
  }
})