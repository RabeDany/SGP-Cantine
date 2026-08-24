import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockDenrees, mockMouvements } from '@/data/mockData'
import { daysUntil, generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import { useAuditStore } from '@/stores/audit'
import { useAnomalieStore } from '@/stores/anomalie'
import type { AuditActionType, Denree, DenreeCategorie, MouvementStock, StockStatus, UniteMesure, UserRole } from '@/types'

export const useStockStore = defineStore('stock', () => {
  const denrees = ref<Denree[]>(loadFromStorage('denrees', [...mockDenrees]))
  const mouvements = ref<MouvementStock[]>(loadFromStorage('mouvements', [...mockMouvements]))

  function persist() {
    saveToStorage('denrees', denrees.value)
    saveToStorage('mouvements', mouvements.value)
  }

  function getDenree(id: string) {
    return denrees.value.find((d) => d.id === id)
  }

  function getStockStatus(denree: Denree): StockStatus {
    if (denree.stockActuel <= denree.seuilAlerte * 0.5) return 'critical'
    if (denree.stockActuel <= denree.seuilAlerte) return 'warning'
    return 'ok'
  }

  const denreesAvecStatut = computed(() =>
    denrees.value
      .filter((d) => d.actif)
      .map((d) => ({
        ...d,
        status: getStockStatus(d),
        joursAvantPeremption: daysUntil(d.datePeremption),
      })),
  )

  const alertesPeremption = computed(() =>
    denreesAvecStatut.value.filter((d) => {
      const j = d.joursAvantPeremption
      return j !== null && j >= 0 && j <= 7
    }),
  )

  const statsStock = computed(() => ({
    total: denreesAvecStatut.value.length,
    ok: denreesAvecStatut.value.filter((d) => d.status === 'ok').length,
    warning: denreesAvecStatut.value.filter((d) => d.status === 'warning').length,
    critical: denreesAvecStatut.value.filter((d) => d.status === 'critical').length,
    peremption: alertesPeremption.value.length,
  }))

  function createDenree(data: {
    nom: string
    categorie: DenreeCategorie
    unite: UniteMesure
    seuilAlerte: number
    dureeConservationJours: number
    datePeremption?: string
    stockInitial?: number
  }) {
    const id = generateId('d')
    denrees.value.push({
      id,
      nom: data.nom,
      categorie: data.categorie,
      unite: data.unite,
      seuilAlerte: data.seuilAlerte,
      dureeConservationJours: data.dureeConservationJours,
      stockActuel: data.stockInitial ?? 0,
      datePeremption: data.datePeremption,
      actif: true,
    })
    persist()
    return id
  }

  function updateDenree(id: string, data: Partial<Denree>) {
    const idx = denrees.value.findIndex((d) => d.id === id)
    if (idx >= 0) {
      denrees.value[idx] = { ...denrees.value[idx], ...data }
      persist()
    }
  }

  function deleteDenree(id: string) {
    const idx = denrees.value.findIndex((d) => d.id === id)
    if (idx >= 0) {
      denrees.value[idx].actif = false
      persist()
    }
  }

  function enregistrerEntree(data: {
    denreeId: string
    date: string
    quantite: number
    provenance: MouvementStock['provenance']
    prixAchat?: number
    numeroBon?: string
    userId: string
    datePeremption?: string
  }, user?: { id: string; nom: string; role: UserRole }) {
    const denree = getDenree(data.denreeId)
    if (!denree) return { ok: false, error: 'Denrée introuvable.' }

    denree.stockActuel += data.quantite
    if (data.datePeremption) denree.datePeremption = data.datePeremption

    mouvements.value.unshift({
      id: generateId('m'),
      denreeId: data.denreeId,
      type: 'entree',
      date: data.date,
      quantite: data.quantite,
      provenance: data.provenance,
      prixAchat: data.prixAchat,
      numeroBon: data.numeroBon,
      userId: data.userId,
      createdAt: new Date().toISOString(),
    })
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'stock_entry',
        actionLabel: 'Enregistrement entrée stock',
        description: `Entrée stock ${data.quantite} ${denree.unite} de ${denree.nom} par ${user.nom}`,
        module: 'stock',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: denree.id,
        targetType: 'denree',
      })
    }
    return { ok: true }
  }

  function enregistrerSortie(data: {
    denreeId: string
    date: string
    quantite: number
    motif: MouvementStock['motif']
    commentaire?: string
    menuId?: string
    userId: string
  }, user?: { id: string; nom: string; role: UserRole }, options?: { ignorerControleHoraire?: boolean; now?: Date }) {
    const denree = getDenree(data.denreeId)
    if (!denree) return { ok: false, error: 'Denrée introuvable.' }
    if (data.quantite > denree.stockActuel) {
      return {
        ok: false,
        error: `Stock insuffisant. Disponible : ${denree.stockActuel} ${denree.unite}.`,
      }
    }
    if (data.motif === 'avarie' && !data.commentaire?.trim()) {
      return { ok: false, error: 'Un commentaire est obligatoire pour une avarie.' }
    }

    if (!options?.ignorerControleHoraire) {
      const anomalieStore = useAnomalieStore()
      const controle = anomalieStore.bloquerSortieHorsHoraire(
        {
          denreeId: data.denreeId,
          denreeNom: denree.nom,
          quantite: data.quantite,
          date: data.date,
          motif: data.motif,
          commentaire: data.commentaire,
          menuId: data.menuId,
          userId: data.userId,
          payload: { ...data, user },
          now: options?.now,
        },
        user,
      )
      if (controle.blocked) {
        return { ok: false, error: controle.message }
      }
    }

    denree.stockActuel -= data.quantite
    mouvements.value.unshift({
      id: generateId('m'),
      denreeId: data.denreeId,
      type: 'sortie',
      date: data.date,
      quantite: data.quantite,
      motif: data.motif,
      commentaire: data.commentaire,
      menuId: data.menuId,
      userId: data.userId,
      createdAt: new Date().toISOString(),
    })
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'stock_exit',
        actionLabel: 'Enregistrement sortie stock',
        description: `Sortie stock ${data.quantite} ${denree.unite} de ${denree.nom} par ${user.nom}`,
        module: 'stock',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: denree.id,
        targetType: 'denree',
      })
    }
    return { ok: true }
  }

  const mouvementsRecents = computed(() =>
    [...mouvements.value]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
  )

  const mouvementsSorties = computed(() =>
    mouvements.value.filter((movement) => movement.type === 'sortie'),
  )

  const volumeGaspillage = computed(() =>
    mouvementsSorties.value
      .filter((movement) => movement.motif === 'perte' || movement.motif === 'avarie')
      .reduce((sum, movement) => sum + movement.quantite, 0),
  )

  const volumeSorties = computed(() =>
    mouvementsSorties.value.reduce((sum, movement) => sum + movement.quantite, 0),
  )

  const tauxGaspillage = computed(() =>
    volumeSorties.value ? (volumeGaspillage.value / volumeSorties.value) * 100 : 0,
  )

  const rupturesActives = computed(() =>
    denreesAvecStatut.value.filter((d) => d.status === 'critical').length,
  )

  const prixUnitaireMoyen = computed(() => {
    const prixParDenree = new Map<string, { quantite: number; montant: number }>()
    mouvements.value
      .filter((movement) => movement.type === 'entree' && movement.prixAchat != null && movement.quantite > 0)
      .forEach((movement) => {
        const current = prixParDenree.get(movement.denreeId) ?? { quantite: 0, montant: 0 }
        current.quantite += movement.quantite
        current.montant += movement.prixAchat ?? 0
        prixParDenree.set(movement.denreeId, current)
      })

    return Object.fromEntries(
      Array.from(prixParDenree.entries()).map(([denreeId, data]) => [
        denreeId,
        data.quantite > 0 ? data.montant / data.quantite : 0,
      ]),
    ) as Record<string, number>
  })

  return {
    denrees,
    mouvements,
    denreesAvecStatut,
    alertesPeremption,
    statsStock,
    mouvementsRecents,
    mouvementsSorties,
    volumeGaspillage,
    volumeSorties,
    tauxGaspillage,
    rupturesActives,
    prixUnitaireMoyen,
    getDenree,
    getStockStatus,
    createDenree,
    updateDenree,
    deleteDenree,
    enregistrerEntree,
    enregistrerSortie,
  }
})
