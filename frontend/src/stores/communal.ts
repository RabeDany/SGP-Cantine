import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loadFromStorage, saveToStorage } from '@/utils/helpers'
import type { DenreeCategorie, UniteMesure } from '@/types'

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
  const denrees = ref<DenreeEcole[]>(loadFromStorage<DenreeEcole[]>('communal_denrees', [...mockDenrees]))
  const consommations = ref<ConsommationEcole[]>(loadFromStorage<ConsommationEcole[]>('communal_consommations', [...mockConsommations]))

  function persist() {
    saveToStorage('communal_ecoles', ecoles.value)
    saveToStorage('communal_denrees', denrees.value)
    saveToStorage('communal_consommations', consommations.value)
  }

  function getEcole(id: string) {
    return ecoles.value.find((e) => e.id === id)
  }

  function getDenree(id: string) {
    return denrees.value.find((d) => d.id === id)
  }

  function getStockEcole(ecoleId: string, denreeId: string): number {
    return stocksParEcole[ecoleId]?.[denreeId] ?? 0
  }

  /** Ruptures de stock par région — denrées sous le seuil d'alerte */
  const rupturesParRegion = computed(() => {
    const result: Record<string, Array<{ ecole: Ecole; denree: DenreeEcole; stock: number; manque: number }>> = {}

    for (const ecole of ecoles.value) {
      for (const denree of denrees.value) {
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
    for (const conso of consommations.value) {
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
    return consommations.value.filter((conso) => {
      const matchesDenree = denreeId === null || conso.denreeId === denreeId
      const matchesEcole = ecoleId === null || conso.ecoleId === ecoleId
      const matchesPeriode = periode === null || conso.periode === periode
      return matchesDenree && matchesEcole && matchesPeriode
    })
  }

  const periodesDisponibles = computed(() =>
    Array.from(new Set(consommations.value.map((c) => c.periode))).sort().reverse(),
  )

  const statsCommunales = computed(() => {
    const totalEcoles = ecoles.value.length
    const totalRuptures = Object.values(rupturesParRegion.value).reduce((sum, list) => sum + list.length, 0)
    const totalConsommation = consommations.value.reduce((sum, c) => sum + c.quantite, 0)
    const totalRepas = consommations.value.reduce((sum, c) => sum + c.repasServis, 0)
    return { totalEcoles, totalRuptures, totalConsommation, totalRepas }
  })

  return {
    ecoles,
    denrees,
    consommations,
    rupturesParRegion,
    ecolesPlusConsommatrices,
    periodesDisponibles,
    statsCommunales,
    getEcole,
    getDenree,
    getStockEcole,
    getConsommationFiltree,
    persist,
  }
})