import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockMenu, mockRecettes } from '@/data/mockData'
import { generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import { useStockStore } from '@/stores/stock'
import { usePresenceStore } from '@/stores/presence'
import { JOURS_SEMAINE } from '@/types'
import type {
  BesoinDenree,
  IngredientRecette,
  MenuHebdo,
  Recette,
  RecetteCategorie,
  SortiePreparationLigne,
} from '@/types'

function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function createMenuForWeek(semaineDebut: string): MenuHebdo {
  return {
    id: generateId('menu'),
    semaineDebut,
    jours: mockMenu.jours.map((jour) => ({ ...jour })),
    valide: false,
  }
}

function normalizeMenu(menu: MenuHebdo): MenuHebdo {
  return {
    ...menu,
    jours: menu.jours?.map((jour) => ({ ...jour })) ?? [],
    valide: Boolean(menu.valide),
    validationMouvements: menu.validationMouvements ?? [],
  }
}

function syncMenuInStore(menus: MenuHebdo[], menu: MenuHebdo): MenuHebdo {
  const existing = menus.find((item) => item.id === menu.id)
  if (existing) {
    Object.assign(existing, normalizeMenu(menu))
    return existing
  }

  const nextMenu = normalizeMenu(menu)
  menus.push(nextMenu)
  return nextMenu
}

export const useMenuStore = defineStore('menu', () => {
  const recettes = ref<Recette[]>(loadFromStorage('recettes', [...mockRecettes]))
  const persistedMenus = loadFromStorage<MenuHebdo[]>('menus', [])
  const persistedMenu = loadFromStorage<MenuHebdo | null>('menu', null)

  const menus = ref<MenuHebdo[]>(
    persistedMenus.length
      ? persistedMenus.map((menu) => normalizeMenu(menu))
      : persistedMenu
        ? [normalizeMenu(persistedMenu)]
        : [createMenuForWeek(getWeekStart())],
  )

  const currentWeek = getWeekStart()
  const menuForCurrentWeek = menus.value.find((menu) => menu.semaineDebut === currentWeek)
  const initialMenu = menuForCurrentWeek ?? menus.value[0] ?? createMenuForWeek(currentWeek)
  const menuActuel = ref<MenuHebdo>(normalizeMenu(initialMenu))

  if (!menus.value.some((menu) => menu.id === menuActuel.value.id)) {
    menus.value.unshift(menuActuel.value)
  }

  if (!menus.value.some((menu) => menu.semaineDebut === currentWeek)) {
    const nextMenu = createMenuForWeek(currentWeek)
    menus.value.unshift(nextMenu)
    menuActuel.value = nextMenu
  } else if (menuActuel.value.semaineDebut !== currentWeek) {
    menuActuel.value = menus.value.find((menu) => menu.semaineDebut === currentWeek)!
  }

  menuActuel.value = syncMenuInStore(menus.value, menuActuel.value)

  function persist() {
    saveToStorage('recettes', recettes.value)
    saveToStorage('menus', menus.value)
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

  function invaliderMenu(userId = 'system') {
    if (!menuActuel.value.valide) {
      return { ok: true }
    }

    const stockStore = useStockStore()
    for (const movement of menuActuel.value.validationMouvements ?? []) {
      const result = stockStore.enregistrerEntree({
        denreeId: movement.denreeId,
        date: todayISO(),
        quantite: movement.quantite,
        provenance: 'don',
        userId: movement.userId || userId,
      })
      if (!result.ok) {
        return { ok: false, error: result.error ?? 'Erreur lors de l’annulation de validation.' }
      }
    }

    menuActuel.value.valide = false
    delete menuActuel.value.dateValidation
    delete menuActuel.value.validationParId
    menuActuel.value.validationMouvements = []
    persist()
    return { ok: true }
  }

  function updateMenuJour(jour: number, recetteId: string | null, portionsPrevues: number) {
    const j = menuActuel.value.jours.find((x) => x.jour === jour)
    if (!j) return

    const changed = j.recetteId !== recetteId || j.portionsPrevues !== portionsPrevues
    if (!changed) return

    const previousState = { recetteId: j.recetteId, portionsPrevues: j.portionsPrevues }

    j.recetteId = recetteId
    j.portionsPrevues = portionsPrevues

    if (menuActuel.value.valide) {
      const result = invaliderMenu()
      if (!result.ok) {
        j.recetteId = previousState.recetteId
        j.portionsPrevues = previousState.portionsPrevues
        return
      }
    }

    persist()
  }

  function validerMenu(userId: string) {
    if (menuActuel.value.valide) {
      return { ok: false, error: 'Ce menu a déjà été validé.' }
    }

    const stockStore = useStockStore()
    const sorties = calculerSortiesPreparation()
    const totaux = new Map<string, number>()

    for (const sortie of sorties) {
      totaux.set(sortie.denreeId, (totaux.get(sortie.denreeId) ?? 0) + sortie.quantite)
    }

    const insuffisances = Array.from(totaux.entries())
      .map(([denreeId, quantite]) => {
        const denree = stockStore.getDenree(denreeId)
        if (!denree) return null
        return quantite > denree.stockActuel
          ? `${denree.nom} (${quantite - denree.stockActuel} ${denree.unite})`
          : null
      })
      .filter(Boolean)

    if (insuffisances.length) {
      return { ok: false, error: `Stock insuffisant : ${insuffisances.join(', ')}` }
    }

    for (const sortie of sorties) {
      const result = stockStore.enregistrerSortie({
        denreeId: sortie.denreeId,
        date: todayISO(),
        quantite: sortie.quantite,
        motif: 'preparation_repas',
        menuId: sortie.recetteId,
        userId,
        commentaire: `Préparation ${sortie.jourLabel} - ${sortie.recetteNom}`,
      })
      if (!result.ok) {
        return { ok: false, error: result.error ?? 'Erreur lors de la validation du menu.' }
      }
    }

    menuActuel.value.valide = true
    menuActuel.value.dateValidation = todayISO()
    menuActuel.value.validationParId = userId
    menuActuel.value.validationMouvements = sorties.map((sortie) => ({
      denreeId: sortie.denreeId,
      quantite: sortie.quantite,
      userId,
      commentaire: `Préparation ${sortie.jourLabel} - ${sortie.recetteNom}`,
    }))
    persist()
    return { ok: true }
  }

  function setMenuActuel(menuId: string) {
    const menu = menus.value.find((item) => item.id === menuId)
    if (menu) {
      menuActuel.value = menu
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
        presenceStore.isPointageEffectuePourDate(dateJourISO)
          ? presenceStore.totalPresentsPourDate(dateJourISO)
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
    if (menuActuel.value.valide) return []

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

  function calculerSortiesPreparation() {
    const sorties: SortiePreparationLigne[] = []
    const presenceStore = usePresenceStore()

    for (const jour of menuActuel.value.jours) {
      if (!jour.recetteId) continue
      const recette = getRecette(jour.recetteId)
      if (!recette) continue

      const jourDate = `${menuActuel.value.semaineDebut}T00:00:00`
      const dateJour = new Date(jourDate)
      dateJour.setDate(dateJour.getDate() + jour.jour)
      const dateJourISO = dateJour.toISOString().split('T')[0]

      const portions = presenceStore.isPointageEffectuePourDate(dateJourISO)
        ? presenceStore.totalPresentsPourDate(dateJourISO)
        : jour.portionsPrevues

      const jourLabel = JOURS_SEMAINE[jour.jour]
      for (const ing of recette.ingredients) {
        sorties.push({
          jour: jour.jour,
          jourLabel,
          recetteId: recette.id,
          recetteNom: recette.nom,
          denreeId: ing.denreeId,
          quantite: ing.quantiteParPortion * portions,
          portions,
        })
      }
    }
    return sorties
  }

  const sortiesPreparation = computed(() => calculerSortiesPreparation())

  const menusDisponibles = computed(() =>
    [...menus.value].sort((a, b) => b.semaineDebut.localeCompare(a.semaineDebut)),
  )

  return {
    recettes,
    menuActuel,
    menus,
    menusDisponibles,
    recettesActives,
    listeCourses,
    denreesManquantes,
    sortiesPreparation,
    getRecette,
    recetteEstValide,
    createRecette,
    updateRecette,
    updateMenuJour,
    invaliderMenu,
    validerMenu,
    setMenuActuel,
    calculerBesoins,
  }
})
