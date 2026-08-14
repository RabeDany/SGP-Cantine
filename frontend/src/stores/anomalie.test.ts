import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnomalieStore } from './anomalie'

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

describe('anomalie store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('detecte un écart d\'inventaire > 10% avec niveau 1 (10-20%)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 88 },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(1)
    expect(detectees[0].type).toBe('ecart_inventaire')
    expect(detectees[0].statut).toBe('en_cours')
  })

  it('ne détecte pas un écart <= 10%', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 92 },
    ])

    expect(detectees).toHaveLength(0)
  })

  it('détecte un écart > 20% avec niveau 2', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 70 },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(2)
  })

  it('détecte un écart > 50% avec niveau 3 (bloquant)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 40 },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(3)
  })

  it('détecte une consommation > 150% de la moyenne sur 4 semaines (niveau 2)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterConsommationAnormale([
      {
        denreeId: 'd1',
        nom: 'Riz',
        unite: 'kg',
        quantitePeriode: 60,
        moyenne4Semaines: 30,
        nbEleves: 180,
      },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(2)
    expect(detectees[0].type).toBe('consommation_anormale')
  })

  it('ne détecte pas une consommation <= 150%', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterConsommationAnormale([
      {
        denreeId: 'd1',
        nom: 'Riz',
        unite: 'kg',
        quantitePeriode: 40,
        moyenne4Semaines: 30,
        nbEleves: 180,
      },
    ])

    expect(detectees).toHaveLength(0)
  })

  it('met à jour le statut d\'une anomalie', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 40 },
    ])

    const ok = store.mettreAJourStatut(detectees[0].id, 'justifiee')
    expect(ok).toBe(true)
    expect(store.getAnomalie(detectees[0].id)?.statut).toBe('justifiee')
  })

  it('vérifie le blocage pour une anomalie de niveau 3 active', () => {
    const store = useAnomalieStore()
    store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 40 },
    ])

    expect(store.verifierBlocage('d1')).toBe(true)
    expect(store.verifierBlocage('d2')).toBe(false)
  })

  it('ne bloque plus après justification d\'une anomalie niveau 3', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 40 },
    ])

    store.mettreAJourStatut(detectees[0].id, 'justifiee')
    expect(store.verifierBlocage('d1')).toBe(false)
  })

  it('calcule les statistiques des anomalies', () => {
    const store = useAnomalieStore()
    store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 88 },
      { denreeId: 'd2', nom: 'Poisson', unite: 'kg', stockTheorique: 100, stockPhysique: 70 },
      { denreeId: 'd3', nom: 'Huile', unite: 'L', stockTheorique: 100, stockPhysique: 40 },
    ])

    const stats = store.statsAnomalies
    expect(stats.total).toBe(3)
    expect(stats.niveau1).toBe(1)
    expect(stats.niveau2).toBe(1)
    expect(stats.niveau3).toBe(1)
    expect(stats.actives).toBe(3)
  })
})