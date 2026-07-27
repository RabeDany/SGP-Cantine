import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockMenu, mockRecettes } from '@/data/mockData'
import { generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import { useStockStore } from '@/stores/stock'
import { usePresenceStore } from '@/stores/presence'
import type { BesoinDenree, IngredientRecette, MenuHebdo, Recette, RecetteCategorie } from '@/types'

export const useMenuStore = defineStore('menu', () => {
  const recettes = ref<Recette[]>(loadFromStorage('recettes', [...mockRecettes]))
  const menuActuel = ref<MenuHebdo>(loadFromStorage('menu', { ...mockMenu }))

  function persist() {
    saveToStorage('recettes', recettes.value)
    saveToStorage('menu', menuActuel.value)
  }

  function getRecette(id: string) {
    return recettes.value.find((r) => r.id === id)
  }

  function recetteEstValide(recette: Recette): boolean {
    const stockStore = useStockStore()
    return recette.ingredients.every((ing) => {
      const denree = stockStore.getDenree(ing.denreeId)
      return denree?.actif && ing.quantiteParPortion > 0
    })
  }

  const recettesActives = computed(() =>
    recettes.value
      .filter((r) => r.actif)
      .map((r) => ({ ...r, valide: recetteEstValide(r) })),
  )

  function createRecette(data: {
    nom: string
    categorie: RecetteCategorie
    ingredients: IngredientRecette[]
    instructions: string
  }) {
    const id = generateId('r')
    recettes.value.push({ ...data, id, actif: true })
    persist()
    return id
  }

  function updateRecette(id: string, data: Partial<Recette>) {
    const idx = recettes.value.findIndex((r) => r.id === id)
    if (idx >= 0) {
      recettes.value[idx] = { ...recettes.value[idx], ...data }
      persist()
    }
  }

  function updateMenuJour(jour: number, recetteId: string | null, portionsPrevues: number) {
    const j = menuActuel.value.jours.find((x) => x.jour === jour)
    if (j) {
      j.recetteId = recetteId
      j.portionsPrevues = portionsPrevues
      menuActuel.value.valide = false
      persist()
    }
  }

  function calculerBesoins(): BesoinDenree[] {
    const stockStore = useStockStore()
    const presenceStore = usePresenceStore()
    const besoins = new Map<string, number>()

    for (const jour of menuActuel.value.jours) {
      if (!jour.recetteId) continue
      const recette = getRecette(jour.recetteId)
      if (!recette) continue

      const jourDate = `${menuActuel.value.semaineDebut}T00:00:00`
      const dateJour = new Date(jourDate)
      dateJour.setDate(dateJour.getDate() + jour.jour)
      const dateJourISO = dateJour.toISOString().split('T')[0]
      const portions =
        dateJourISO === todayISO() && presenceStore.pointageEffectue
          ? presenceStore.totalPresentsAujourdhui
          : jour.portionsPrevues

      for (const ing of recette.ingredients) {
        const qte = ing.quantiteParPortion * portions
        besoins.set(ing.denreeId, (besoins.get(ing.denreeId) ?? 0) + qte)
      }
    }

    return Array.from(besoins.entries()).map(([denreeId, quantiteNecessaire]) => {
      const denree = stockStore.getDenree(denreeId)
      const stockDisponible = denree?.stockActuel ?? 0
      return {
        denreeId,
        quantiteNecessaire,
        stockDisponible,
        manquant: Math.max(0, quantiteNecessaire - stockDisponible),
      }
    })
  }

  const listeCourses = computed(() => {
    const stockStore = useStockStore()
    return calculerBesoins()
      .map((b) => {
        const denree = stockStore.getDenree(b.denreeId)
        return { ...b, denree, manque: b.manquant > 0 }
      })
      .sort((a, b) => b.manquant - a.manquant)
  })

  const denreesManquantes = computed(() =>
    listeCourses.value.filter((b) => b.manque),
  )

  return {
    recettes,
    menuActuel,
    recettesActives,
    listeCourses,
    denreesManquantes,
    getRecette,
    recetteEstValide,
    createRecette,
    updateRecette,
    updateMenuJour,
    calculerBesoins,
  }
})
