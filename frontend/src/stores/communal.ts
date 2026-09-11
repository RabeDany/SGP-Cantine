import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadFromStorage, saveToStorage } from '@/utils/helpers'
import type { DenreeCategorie, UniteMesure } from '@/types'
import { useSyncStore } from '@/stores/sync'

export interface Ecole {
  id: string
  nom: string
  commune: string
  region: string
  totalInscrits: number
}

export interface DenreeEcole {
  id: string
  nom: string
  categorie: DenreeCategorie
  unite: UniteMesure
  seuilAlerte: number
  stockActuel: number
}

export interface ConsommationEcole {
  ecoleId: string
  denreeId: string
  quantite: number
  unite: UniteMesure
  repasServis: number
  periode: string
}

const mockEcoles: Ecole[] = [
  { id: 'e1', nom: 'EPP Ambovombe Centre', commune: 'Ambovombe-Androy', region: 'Androy', totalInscrits: 220 },
  { id: 'e2', nom: 'EPP Ambovombe Nord', commune: 'Ambovombe-Androy', region: 'Androy', totalInscrits: 185 },
  { id: 'e3', nom: 'EPP Tôlagnaro Est', commune: 'Tôlagnaro', region: 'Anosy', totalInscrits: 240 },
  { id: 'e4', nom: 'EPP Tôlagnaro Ouest', commune: 'Tôlagnaro', region: 'Anosy', totalInscrits: 160 },
]

const mockDenrees: DenreeEcole[] = [
  { id: 'd1', nom: 'Riz blanc', categorie: 'cereale', unite: 'kg', seuilAlerte: 50, stockActuel: 120 },
  { id: 'd2', nom: 'Haricots rouges', categorie: 'legumineuse', unite: 'kg', seuilAlerte: 20, stockActuel: 18 },
  { id: 'd3', nom: 'Huile de coco', categorie: 'huile', unite: 'litre', seuilAlerte: 10, stockActuel: 8 },
  { id: 'd4', nom: 'Laitue', categorie: 'legume', unite: 'kg', seuilAlerte: 5, stockActuel: 3 },
  { id: 'd5', nom: 'Poisson séché', categorie: 'proteine', unite: 'kg', seuilAlerte: 8, stockActuel: 12 },
  { id: 'd6', nom: 'Sel iodé', categorie: 'sel', unite: 'kg', seuilAlerte: 3, stockActuel: 5 },
]

// Stocks par école (variations pour simuler des ruptures différentes)
const stocksParEcole: Record<string, Record<string, number>> = {
  e1: { d1: 120, d2: 18, d3: 8, d4: 3, d5: 12, d6: 5 },
  e2: { d1: 30, d2: 5, d3: 2, d4: 1, d5: 4, d6: 2 },
  e3: { d1: 200, d2: 40, d3: 15, d4: 8, d5: 25, d6: 10 },
  e4: { d1: 15, d2: 3, d3: 1, d4: 0, d5: 2, d6: 1 },
}

const mockConsommations: ConsommationEcole[] = [
  { ecoleId: 'e1', denreeId: 'd1', quantite: 450, unite: 'kg', repasServis: 3200, periode: '2026-07' },
  { ecoleId: 'e1', denreeId: 'd2', quantite: 120, unite: 'kg', repasServis: 3200, periode: '2026-07' },
  { ecoleId: 'e2', denreeId: 'd1', quantite: 380, unite: 'kg', repasServis: 2800, periode: '2026-07' },
  { ecoleId: 'e2', denreeId: 'd2', quantite: 95, unite: 'kg', repasServis: 2800, periode: '2026-07' },
  { ecoleId: 'e3', denreeId: 'd1', quantite: 520, unite: 'kg', repasServis: 3600, periode: '2026-07' },
  { ecoleId: 'e3', denreeId: 'd2', quantite: 140, unite: 'kg', repasServis: 3600, periode: '2026-07' },
  { ecoleId: 'e4', denreeId: 'd1', quantite: 300, unite: 'kg', repasServis: 2400, periode: '2026-07' },
  { ecoleId: 'e4', denreeId: 'd2', quantite: 80, unite: 'kg', repasServis: 2400, periode: '2026-07' },
]

export const useCommunalStore = defineStore('communal', () => {
  const ecoles = ref<Ecole[]>(loadFromStorage<Ecole[]>('communal_ecoles', [...mockEcoles]))
  const syncStore = useSyncStore()
  const denrees = ref<DenreeEcole[]>(loadFromStorage<DenreeEcole[]>('communal_denrees', [...mockDenrees]))
  const consommations = ref<ConsommationEcole[]>(loadFromStorage<ConsommationEcole[]>('communal_consommations', [...mockConsommations]))

  function persist() {
    saveToStorage('communal_ecoles', ecoles.value)
    saveToStorage('communal_denrees', denrees.value)
    saveToStorage('communal_consommations', consommations.value)
  }

  function getEcole(id: string) {
    return ecolesRapport.value.find((e) => e.id === id)
  }

  function getDenree(id: string) {
    return denreesRapport.value.find((d) => d.id === id)
  }

  function getStockEcole(ecoleId: string, denreeId: string): number {
    const imported = syncStore.imports.find((item) => item.site.id === ecoleId)
    const denree = imported?.snapshot.denrees.find((item) => item.id === denreeId)
    if (denree) return denree.stockActuel
    return stocksParEcole[ecoleId]?.[denreeId] ?? 0
  }

  const ecolesRapport = computed<Ecole[]>(() =>
    syncStore.imports.length
      ? syncStore.imports.map((item) => item.site)
      : ecoles.value,
  )

  const denreesRapport = computed<DenreeEcole[]>(() => {
    if (!syncStore.imports.length) return denrees.value
    const catalog = new Map<string, DenreeEcole>()
    for (const imported of syncStore.imports) {
      for (const denree of imported.snapshot.denrees) {
        catalog.set(denree.id, {
          id: denree.id,
          nom: denree.nom,
          categorie: denree.categorie,
          unite: denree.unite,
          seuilAlerte: denree.seuilAlerte,
          stockActuel: denree.stockActuel,
        })
      }
    }
    return Array.from(catalog.values())
  })

  const consommationsRapport = computed<ConsommationEcole[]>(() => {
    if (!syncStore.imports.length) return consommations.value
    return syncStore.imports.flatMap((imported) => {
      const repasServis = imported.snapshot.pointages.reduce((sum, pointage) => sum + pointage.presents, 0)
      const byDenree = new Map<string, number>()
      for (const mouvement of imported.snapshot.mouvements) {
        if (mouvement.type !== 'sortie' || mouvement.motif !== 'preparation_repas') continue
        byDenree.set(mouvement.denreeId, (byDenree.get(mouvement.denreeId) ?? 0) + mouvement.quantite)
      }
      return Array.from(byDenree.entries()).map(([denreeId, quantite]) => ({
        ecoleId: imported.site.id,
        denreeId,
        quantite,
        unite: imported.snapshot.denrees.find((denree) => denree.id === denreeId)?.unite ?? 'kg',
        repasServis,
        periode: new Date().toISOString().slice(0, 7),
      }))
    })
  })

  /** Ruptures de stock par région — denrées sous le seuil d'alerte */
  const rupturesParRegion = computed(() => {
    const result: Record<string, Array<{ ecole: Ecole; denree: DenreeEcole; stock: number; manque: number }>> = {}

    for (const ecole of ecolesRapport.value) {
      for (const denree of denreesRapport.value) {
        const stock = getStockEcole(ecole.id, denree.id)
        if (stock <= denree.seuilAlerte) {
          if (!result[ecole.region]) result[ecole.region] = []
          result[ecole.region].push({
            ecole,
            denree,
            stock,
            manque: denree.seuilAlerte - stock,
          })
        }
      }
    }
    return result
  })

  /** Écoles les plus consommatrices — triées par quantité totale consommée */
  const ecolesPlusConsommatrices = computed(() => {
    const totals = new Map<string, { ecole: Ecole; quantite: number; repasServis: number }>()
    for (const conso of consommationsRapport.value) {
      const ecole = getEcole(conso.ecoleId)
      if (!ecole) continue
      const current = totals.get(ecole.id) ?? { ecole, quantite: 0, repasServis: 0 }
      current.quantite += conso.quantite
      current.repasServis += conso.repasServis
      totals.set(ecole.id, current)
    }
    return Array.from(totals.values()).sort((a, b) => b.quantite - a.quantite)
  })

  /** Consommation par denrée et par école, filtrable */
  function getConsommationFiltree(denreeId: string | null, ecoleId: string | null, periode: string | null) {
    return consommationsRapport.value.filter((conso) => {
      const matchesDenree = denreeId === null || conso.denreeId === denreeId
      const matchesEcole = ecoleId === null || conso.ecoleId === ecoleId
      const matchesPeriode = periode === null || conso.periode === periode
      return matchesDenree && matchesEcole && matchesPeriode
    })
  }

  const periodesDisponibles = computed(() =>
    Array.from(new Set(consommationsRapport.value.map((c) => c.periode))).sort().reverse(),
  )

  const statsCommunales = computed(() => {
    const totalEcoles = ecolesRapport.value.length
    const totalRuptures = Object.values(rupturesParRegion.value).reduce((sum, list) => sum + list.length, 0)
    const totalConsommation = consommationsRapport.value.reduce((sum, c) => sum + c.quantite, 0)
    const totalRepas = consommationsRapport.value.reduce((sum, c) => sum + c.repasServis, 0)
    return { totalEcoles, totalRuptures, totalConsommation, totalRepas }
  })

  const stocksMutualisables = computed(() => {
    const result: Array<{ source: Ecole; cible: Ecole; denree: DenreeEcole; quantite: number }> = []
    for (const denree of denreesRapport.value) {
      const excedents = ecolesRapport.value
        .map((ecole) => ({ ecole, quantite: Math.max(0, getStockEcole(ecole.id, denree.id) - denree.seuilAlerte) }))
        .filter((item) => item.quantite > 0)
      const besoins = ecolesRapport.value
        .map((ecole) => ({ ecole, quantite: Math.max(0, denree.seuilAlerte - getStockEcole(ecole.id, denree.id)) }))
        .filter((item) => item.quantite > 0)
      for (const besoin of besoins) {
        for (const excedent of excedents) {
          if (besoin.ecole.id === excedent.ecole.id) continue
          const quantite = Math.min(besoin.quantite, excedent.quantite)
          if (quantite > 0) result.push({ source: excedent.ecole, cible: besoin.ecole, denree, quantite })
        }
      }
    }
    return result
  })

  const commandesGroupees = computed(() =>
    denreesRapport.value
      .map((denree) => {
        const besoins = ecolesRapport.value
          .map((ecole) => ({ ecole, quantite: Math.max(0, denree.seuilAlerte - getStockEcole(ecole.id, denree.id)) }))
          .filter((item) => item.quantite > 0)
        return {
          denree,
          quantiteTotale: besoins.reduce((sum, item) => sum + item.quantite, 0),
          besoins,
        }
      })
      .filter((item) => item.quantiteTotale > 0),
  )

  return {
    ecoles: ecolesRapport,
    denrees: denreesRapport,
    consommations: consommationsRapport,
    rupturesParRegion,
    ecolesPlusConsommatrices,
    periodesDisponibles,
    statsCommunales,
    stocksMutualisables,
    commandesGroupees,
    getEcole,
    getDenree,
    getStockEcole,
    getConsommationFiltree,
    persist,
  }
})