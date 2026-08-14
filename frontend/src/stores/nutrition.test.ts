import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMenuStore } from './menu'
import { useNutritionStore } from './nutrition'
import { useStockStore } from './stock'

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

describe('nutrition store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('propose une suggestion exploitable pour un nutriment insuffisant avec stock disponible', () => {
    const menuStore = useMenuStore()
    const stockStore = useStockStore()
    const store = useNutritionStore()

    menuStore.menuActuel.jours = [
      { jour: 0, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 1, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 2, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 3, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 4, recetteId: 'r3', portionsPrevues: 100 },
    ]
    stockStore.denrees.find((d) => d.id === 'd2')!.stockActuel = 18
    stockStore.denrees.find((d) => d.id === 'd5')!.stockActuel = 12

    const suggestions = store.suggestionsNutrition
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].stockDisponible).toBeGreaterThan(0)
    expect(suggestions[0].type).toMatch(/ingredient|recette/)
    expect(suggestions[0].impactEstime).toBeGreaterThan(0)
  })

  it('bloque l\'optimisation si le menu est sous les 90% nutritionnels requis', () => {
    const menuStore = useMenuStore()
    const store = useNutritionStore()

    menuStore.menuActuel.jours = [
      { jour: 0, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 1, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 2, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 3, recetteId: 'r3', portionsPrevues: 100 },
      { jour: 4, recetteId: 'r3', portionsPrevues: 100 },
    ]

    expect(store.optimisationMenu.nutrition).toBeLessThan(90)
    expect(store.optimisationMenu.respecteSeuils).toBe(false)
    expect(store.optimisationMenu.scoreTotal).toBeLessThan(100)
  })
})
