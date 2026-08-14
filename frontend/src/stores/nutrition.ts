import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import {
  SEUILS_OMS_REPAS,
  NUTRIMENTS_LABELS,
  calculerApportDenree,
  type BilanNutritionnelMenu,
  type CouvertureNutriment,
  type Nutriments,
  type ValeursNutritionnelles,
} from '@/knowledge base/nutrition-knowledge-base'

const ALL_NUTRIMENTS: Nutriments[] = ['calories', 'proteines', 'lipides', 'glucides', 'fer', 'vitamineA']

export interface SuggestionNutrition {
  nutriment: Nutriments
  label: string
  type: 'ingredient' | 'recette'
  titre: string
  detail: string
  stockDisponible: number
  quantiteSuggestion: number
  impactEstime: number
  gainPourcentage: number
  denreeId?: string
  denreeNom?: string
  recetteId?: string
  recetteNom?: string
}

export interface OptimisationMenu {
  nutrition: number
  budget: number
  stock: number
  gaspillage: number
  variete: number
  scoreTotal: number
  respecteSeuils: boolean
  blocage: string | null
}

function calculerCouverture(total: ValeursNutritionnelles): CouvertureNutriment[] {
  return ALL_NUTRIMENTS.map((nutriment) => {
    const apporte = total[nutriment]
    const seuil = SEUILS_OMS_REPAS[nutriment]
    const rawPourcentage = seuil > 0 ? Number(((apporte / seuil) * 100).toFixed(1)) : 0
    const pourcentage = Number(Math.min(100, Math.max(0, rawPourcentage)).toFixed(1))
    return {
      nutriment,
      label: NUTRIMENTS_LABELS[nutriment],
      apporte,
      seuil,
      pourcentage,
      statut: pourcentage >= 100 ? 'ok' : 'insuffisant',
    }
  })
}

export const useNutritionStore = defineStore('nutrition', () => {
  const menuStore = useMenuStore()
  const presenceStore = usePresenceStore()
  const stockStore = useStockStore()

  /**
   * Calcule les portions effectives de chaque jour du menu,
   * en tenant compte du pointage si disponible.
   */
  function portionsPourJour(jour: (typeof menuStore.menuActuel.jours)[0]): number {
    if (!jour.recetteId) return 0
    const dateDebut = new Date(`${menuStore.menuActuel.semaineDebut}T00:00:00`)
    const date = new Date(dateDebut)
    date.setDate(date.getDate() + jour.jour)
    const dateIso = date.toISOString().split('T')[0]

    if (presenceStore.isPointageEffectuePourDate(dateIso)) {
      return presenceStore.totalPresentsPourDate(dateIso)
    }
    return jour.portionsPrevues
  }

  /**
   * Bilan nutritionnel total du menu planifié, comparé aux seuils OMS
   * pour un enfant de 6-12 ans.
   */
  const bilanMenu = computed<BilanNutritionnelMenu>(() => {
    const totalParNutriment: ValeursNutritionnelles = {
      calories: 0,
      proteines: 0,
      lipides: 0,
      glucides: 0,
      fer: 0,
      vitamineA: 0,
    }
    let portionsTotal = 0

    for (const jour of menuStore.menuActuel.jours) {
      if (!jour.recetteId) continue
      const recette = menuStore.getRecette(jour.recetteId)
      if (!recette) continue

      const portions = portionsPourJour(jour)
      portionsTotal += portions

      for (const ingredient of recette.ingredients) {
        // Par portion
        const apportParPortion = calculerApportDenree(ingredient.denreeId, ingredient.quantiteParPortion)
        totalParNutriment.calories += apportParPortion.calories * portions
        totalParNutriment.proteines += apportParPortion.proteines * portions
        totalParNutriment.lipides += apportParPortion.lipides * portions
        totalParNutriment.glucides += apportParPortion.glucides * portions
        totalParNutriment.fer += apportParPortion.fer * portions
        totalParNutriment.vitamineA += apportParPortion.vitamineA * portions
      }
    }

    // Moyenne par repas (diviser par le nombre total de portions)
    const moyenneParRepas: ValeursNutritionnelles = portionsTotal > 0
      ? {
          calories: totalParNutriment.calories / portionsTotal,
          proteines: totalParNutriment.proteines / portionsTotal,
          lipides: totalParNutriment.lipides / portionsTotal,
          glucides: totalParNutriment.glucides / portionsTotal,
          fer: totalParNutriment.fer / portionsTotal,
          vitamineA: totalParNutriment.vitamineA / portionsTotal,
        }
      : totalParNutriment

    const couverture = calculerCouverture(moyenneParRepas)
    const scoreGlobal = couverture.length
      ? Number((couverture.reduce((s, c) => s + c.pourcentage, 0) / couverture.length).toFixed(1))
      : 0

    return {
      totalParNutriment: moyenneParRepas,
      portionsTotal,
      couverture,
      scoreGlobal,
    }
  })

  /** Nutriments insuffisants (< 90% des apports OMS) — priorité pour recommandations */
  const nutrimentsInsuffisants = computed(() =>
    bilanMenu.value.couverture.filter((c) => c.pourcentage < 90),
  )

  /** Valide si tous les nutriments atteignent au moins 90% (règle métier n°9) */
  const valideNutritionnellement = computed(() =>
    bilanMenu.value.couverture.every((c) => c.pourcentage >= 90),
  )

  /** Suggestions de compléments nutritionnels basées sur les denrées en stock et les recettes disponibles */
  const suggestionsNutrition = computed<SuggestionNutrition[]>(() => {
    const suggestions: SuggestionNutrition[] = []

    for (const nutriment of ALL_NUTRIMENTS) {
      const couverture = bilanMenu.value.couverture.find((item) => item.nutriment === nutriment)
      if (!couverture || couverture.pourcentage >= 90) continue

      const deficit = Math.max(0, couverture.seuil - couverture.apporte)
      const ingredientCandidates: SuggestionNutrition[] = []

      for (const denree of stockStore.denrees.filter((d) => d.actif && d.stockActuel > 0)) {
        const apportUnitaire = calculerApportDenree(denree.id, 1)
        const gainParKg = apportUnitaire[nutriment]
        if (gainParKg <= 0) continue

        const quantiteSuggestion = Math.max(0.1, Math.min(denree.stockActuel, deficit / Math.max(gainParKg, 0.1)))
        const impactEstime = gainParKg * quantiteSuggestion
        const gainPourcentage = Math.min(100, (impactEstime / Math.max(couverture.seuil, 1)) * 100)

        ingredientCandidates.push({
          nutriment,
          label: couverture.label,
          type: 'ingredient',
          titre: `Ajouter ${quantiteSuggestion.toFixed(2)} ${denree.unite} de ${denree.nom}`,
          detail: `Ce complément apporte environ ${impactEstime.toFixed(1)} ${NUTRIMENTS_LABELS[nutriment].split('(')[1]?.replace(')', '') ?? ''} supplémentaires pour couvrir le manque.`,
          stockDisponible: denree.stockActuel,
          quantiteSuggestion,
          impactEstime,
          gainPourcentage,
          denreeId: denree.id,
          denreeNom: denree.nom,
        })
      }

      const recetteCandidates: SuggestionNutrition[] = []

      for (const recette of menuStore.recettesActives.filter((r) => r.actif)) {
        const gainParRecette = recette.ingredients.reduce((sum, ingredient) => {
          const apport = calculerApportDenree(ingredient.denreeId, ingredient.quantiteParPortion)
          return sum + apport[nutriment]
        }, 0)
        if (gainParRecette <= 0) continue

        const stockDisponible = recette.ingredients.every((ingredient) => {
          const denree = stockStore.getDenree(ingredient.denreeId)
          return denree !== undefined && denree.stockActuel >= ingredient.quantiteParPortion
        })
        if (!stockDisponible) continue

        const gainPourcentage = Math.min(100, (gainParRecette / Math.max(couverture.seuil, 1)) * 100)
        recetteCandidates.push({
          nutriment,
          label: couverture.label,
          type: 'recette',
          titre: `Remplacer ou compléter par ${recette.nom}`,
          detail: `Cette recette apporte ${gainParRecette.toFixed(1)} ${NUTRIMENTS_LABELS[nutriment].split('(')[1]?.replace(')', '') ?? ''} supplémentaires.`,
          stockDisponible: 1,
          quantiteSuggestion: 1,
          impactEstime: gainParRecette,
          gainPourcentage,
          recetteId: recette.id,
          recetteNom: recette.nom,
        })
      }

      const bestIngredient = ingredientCandidates.sort((a, b) => b.impactEstime - a.impactEstime)[0]
      const bestRecette = recetteCandidates.sort((a, b) => b.impactEstime - a.impactEstime)[0]

      if (bestIngredient) suggestions.push(bestIngredient)
      if (bestRecette && (!bestIngredient || bestRecette.impactEstime > bestIngredient.impactEstime * 0.7)) {
        suggestions.push(bestRecette)
      }
    }

    return suggestions.slice(0, 6)
  })

  const optimisationMenu = computed<OptimisationMenu>(() => {
    const nutrition = Math.min(100, bilanMenu.value.scoreGlobal)
    const budget = (() => {
      const joursAvecRecette = menuStore.menuActuel.jours.filter((jour) => jour.recetteId).length
      if (joursAvecRecette === 0) return 0
      const ratio = Math.max(0, 100 - joursAvecRecette * 5)
      return Math.min(100, ratio)
    })()
    const stock = (() => {
      const ingredients = menuStore.menuActuel.jours.flatMap((jour) => {
        if (!jour.recetteId) return []
        const recette = menuStore.getRecette(jour.recetteId)
        if (!recette) return []
        return recette.ingredients
      })

      if (!ingredients.length) return 0

      const available = ingredients.filter((ingredient) => {
        const denree = stockStore.getDenree(ingredient.denreeId)
        return denree && denree.stockActuel >= ingredient.quantiteParPortion
      }).length

      return Math.max(0, Math.min(100, (available / ingredients.length) * 100))
    })()

    const gaspillage = (() => {
      const wasteRatio = stockStore.tauxGaspillage
      return Math.max(0, 100 - wasteRatio)
    })()

    const variete = (() => {
      const recettesDansMenu = new Set(
        menuStore.menuActuel.jours
          .map((jour) => jour.recetteId)
          .filter((id): id is string => Boolean(id)),
      )
      return Math.min(100, (recettesDansMenu.size / Math.max(menuStore.recettesActives.filter((r) => r.actif).length, 1)) * 100)
    })()

    const scoreTotal = Number(((nutrition * 0.4) + (budget * 0.2) + (stock * 0.2) + (gaspillage * 0.1) + (variete * 0.1)).toFixed(1))
    const respecteSeuils = nutrition >= 90
    const blocage = respecteSeuils ? null : 'Le menu ne respecte pas le seuil nutritionnel minimum de 90% des apports OMS recommandé.'

    return {
      nutrition,
      budget,
      stock,
      gaspillage,
      variete,
      scoreTotal,
      respecteSeuils,
      blocage,
    }
  })

  return {
    bilanMenu,
    nutrimentsInsuffisants,
    valideNutritionnellement,
    suggestionsNutrition,
    optimisationMenu,
  }
})