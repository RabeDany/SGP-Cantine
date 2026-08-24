import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  depasseSeuilPointage,
  estDansPlageHoraireCantine,
  generateId,
  HEURE_CANTINE_DEBUT,
  HEURE_CANTINE_FIN,
  loadFromStorage,
  saveToStorage,
} from '@/utils/helpers'
import { useStockStore } from '@/stores/stock'
import { useAuditStore } from '@/stores/audit'
import type {
  Anomalie,
  AnomalieNiveau,
  AnomalieStatut,
  AnomalieType,
  OperationBloquee,
} from '@/types/anomalie'
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
      cleOperation?: string
      operationBloquee?: OperationBloquee
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
      cleOperation: data.cleOperation,
      operationBloquee: data.operationBloquee,
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

  function mettreAJourStatut(
    id: string,
    statut: AnomalieStatut,
    user?: { id: string; nom: string; role: UserRole },
    justification?: string,
  ): { ok: boolean; error?: string } {
    const anomalie = getAnomalie(id)
    if (!anomalie) return { ok: false, error: 'Anomalie introuvable.' }

    if (anomalie.niveau === 3 && statut === 'justifiee') {
      if (user && user.role !== 'admin') {
        return { ok: false, error: 'Seul le directeur ou le président du CGCS peut lever un blocage niveau 3.' }
      }
      if (!justification?.trim()) {
        return { ok: false, error: 'Une justification est obligatoire pour lever un blocage de niveau 3.' }
      }
    }

    anomalie.statut = statut
    if (statut === 'justifiee' && justification?.trim()) {
      anomalie.justification = justification.trim()
      anomalie.valideurId = user?.id
      anomalie.valideurNom = user?.nom
      anomalie.dateValidation = new Date().toISOString()
    }
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

    return { ok: true }
  }

  function getAnomalieEnCours(cleOperation: string) {
    return anomalies.value.find(
      (a) => a.cleOperation === cleOperation && a.statut === 'en_cours' && a.niveau === 3,
    )
  }

  function aUneJustificationValide(cleOperation: string) {
    return anomalies.value.some(
      (a) => a.cleOperation === cleOperation && a.statut === 'justifiee' && a.niveau === 3,
    )
  }

  function bloquerPointageExcessif(data: {
    presents: number
    inscrits: number
    exemptions: number
    date: string
    classeId?: string | null
    classeNom?: string
    userId: string
    payload: Record<string, unknown>
  }, user?: { id: string; nom: string; role: UserRole }): { blocked: boolean; message?: string } {
    if (!depasseSeuilPointage(data.presents, data.inscrits)) {
      return { blocked: false }
    }

    const cleOperation = data.classeId
      ? `pointage_classe:${data.date}:${data.classeId}`
      : `pointage_global:${data.date}`

    if (aUneJustificationValide(cleOperation)) {
      return { blocked: false }
    }

    const taux = data.inscrits > 0 ? (data.presents / data.inscrits) * 100 : 0
    const existante = getAnomalieEnCours(cleOperation)
    if (existante) {
      return {
        blocked: true,
        message: `Anomalie niveau 3 déjà en cours : pointage supérieur de plus de 20 % aux inscrits. En attente de justification par le directeur ou le président du CGCS.`,
      }
    }

    const cible = data.classeNom ? `classe ${data.classeNom}` : 'l’école'
    logAnomalie(
      {
        type: 'pointage_excessif',
        niveau: 3,
        titre: `Pointage > 20 % des inscrits — ${cible}`,
        description: `${data.presents} présents pour ${data.inscrits} inscrits (${taux.toFixed(0)} %). L’opération est bloquée jusqu’à justification du directeur ou du président du CGCS.`,
        utilisateurId: data.userId,
        cleOperation,
        operationBloquee: {
          kind: data.classeId ? 'pointage_classe' : 'pointage_global',
          payload: data.payload,
        },
        detail: {
          presents: data.presents,
          inscrits: data.inscrits,
          exemptions: data.exemptions,
          date: data.date,
          classeId: data.classeId ?? null,
          taux: Number(taux.toFixed(1)),
        },
      },
      user,
    )

    return {
      blocked: true,
      message: `Anomalie niveau 3 : le pointage dépasse de plus de 20 % le nombre d’inscrits (${data.presents} / ${data.inscrits}). Notification envoyée au directeur et au président du CGCS.`,
    }
  }

  function bloquerSortieHorsHoraire(data: {
    denreeId: string
    denreeNom: string
    quantite: number
    date: string
    motif?: string
    commentaire?: string
    menuId?: string
    userId: string
    payload: Record<string, unknown>
    now?: Date
  }, user?: { id: string; nom: string; role: UserRole }): { blocked: boolean; message?: string } {
    const now = data.now ?? new Date()
    if (estDansPlageHoraireCantine(now)) {
      return { blocked: false }
    }

    const cleOperation = `sortie:${data.date}:${data.denreeId}`
    if (aUneJustificationValide(cleOperation)) {
      return { blocked: false }
    }

    const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const existante = getAnomalieEnCours(cleOperation)
    if (existante) {
      return {
        blocked: true,
        message: `Anomalie niveau 3 déjà en cours : sortie hors plage ${HEURE_CANTINE_DEBUT}h–${HEURE_CANTINE_FIN}h. En attente de justification par le directeur ou le président du CGCS.`,
      }
    }

    logAnomalie(
      {
        type: 'sortie_hors_horaire',
        niveau: 3,
        titre: `Sortie hors ${HEURE_CANTINE_DEBUT}h–${HEURE_CANTINE_FIN}h — ${data.denreeNom}`,
        description: `Sortie de ${data.quantite} tentée à ${heure}, hors de la plage de cantine. L’opération est bloquée jusqu’à justification du directeur ou du président du CGCS.`,
        denreeId: data.denreeId,
        utilisateurId: data.userId,
        cleOperation,
        operationBloquee: {
          kind: 'sortie_stock',
          payload: data.payload,
        },
        detail: {
          heure,
          date: data.date,
          quantite: data.quantite,
          motif: data.motif,
        },
      },
      user,
    )

    return {
      blocked: true,
      message: `Anomalie niveau 3 : sortie hors ${HEURE_CANTINE_DEBUT}h–${HEURE_CANTINE_FIN}h (${heure}). Notification envoyée au directeur et au président du CGCS.`,
    }
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
    bloquerPointageExcessif,
    bloquerSortieHorsHoraire,
    aUneJustificationValide,
    verifierBlocage,
  }
})