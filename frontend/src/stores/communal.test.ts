import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCommunalStore } from './communal'

// Mock localStorage pour l'environnement Node (Vitest)
const storage = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

describe('communal store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('liste les ruptures de stock par région', () => {
    const store = useCommunalStore()
    const ruptures = store.rupturesParRegion

    expect(Object.keys(ruptures)).toContain('Androy')
    expect(Object.keys(ruptures)).toContain('Anosy')
    for (const region of Object.keys(ruptures)) {
      for (const item of ruptures[region]) {
        expect(item.stock).toBeLessThanOrEqual(item.denree.seuilAlerte)
      }
    }
  })

  it('classe les écoles les plus consommatrices par quantité décroissante', () => {
    const store = useCommunalStore()
    const classement = store.ecolesPlusConsommatrices

    expect(classement.length).toBeGreaterThanOrEqual(1)
    for (let i = 1; i < classement.length; i += 1) {
      expect(classement[i - 1].quantite).toBeGreaterThanOrEqual(classement[i].quantite)
    }
  })

  it('filtre les consommations par denrée, école et période', () => {
    const store = useCommunalStore()
    const filtrees = store.getConsommationFiltree('d1', 'e1', '2026-07')

    expect(filtrees.length).toBe(1)
    expect(filtrees[0].denreeId).toBe('d1')
    expect(filtrees[0].ecoleId).toBe('e1')
    expect(filtrees[0].periode).toBe('2026-07')
  })

  it('retourne les consommations sans filtre quand tout est null', () => {
    const store = useCommunalStore()
    const toutes = store.getConsommationFiltree(null, null, null)

    expect(toutes.length).toBe(store.consommations.length)
  })

  it('calcule les statistiques communales', () => {
    const store = useCommunalStore()
    const stats = store.statsCommunales

    expect(stats.totalEcoles).toBe(4)
    expect(stats.totalRuptures).toBeGreaterThan(0)
    expect(stats.totalConsommation).toBeGreaterThan(0)
    expect(stats.totalRepas).toBeGreaterThan(0)
  })

  it('retourne les périodes disponibles triées par ordre décroissant', () => {
    const store = useCommunalStore()
    const periodes = store.periodesDisponibles

    expect(periodes.length).toBeGreaterThanOrEqual(1)
    for (let i = 1; i < periodes.length; i += 1) {
      expect(periodes[i - 1] >= periodes[i]).toBe(true)
    }
  })

  it('retourne une école par son id', () => {
    const store = useCommunalStore()
    const ecole = store.getEcole('e1')

    expect(ecole?.nom).toBe('EPP Ambovombe Centre')
    expect(store.getEcole('inexistante')).toBeUndefined()
  })
})