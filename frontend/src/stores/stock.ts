import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockDenrees, mockMouvements } from '@/data/mockData'
import { daysUntil, generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import type { Denree, DenreeCategorie, MouvementStock, StockStatus, UniteMesure } from '@/types'

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

  function enregistrerEntree(data: {
    denreeId: string
    date: string
    quantite: number
    provenance: MouvementStock['provenance']
    prixAchat?: number
    numeroBon?: string
    userId: string
    datePeremption?: string
  }) {
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
  }) {
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
    return { ok: true }
  }

  const mouvementsRecents = computed(() =>
    [...mouvements.value]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
  )

  return {
    denrees,
    mouvements,
    denreesAvecStatut,
    alertesPeremption,
    statsStock,
    mouvementsRecents,
    getDenree,
    getStockStatus,
    createDenree,
    updateDenree,
    enregistrerEntree,
    enregistrerSortie,
  }
})
