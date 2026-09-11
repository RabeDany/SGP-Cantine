export interface OptimisationOptions {
  /** Taille de population (CDC §3.5 : 50) */
  populationSize?: number
  /** Nombre de générations */
  generations?: number
  /** Budget max optionnel (Ar) — pénalité si dépassé */
  budgetMaximum?: number
  /** Jour (0–4) → recetteId verrouillée */
  recettesVerrouillees?: Record<number, string>
  /** Jours dont la recette ne doit pas changer (indices 0–4) */
  joursVerrouilles?: number[]
  /**
   * Préférences enfants par recette (0–1).
   * Neutre = 0.5 si absente (module feedback futur).
   */
  preferencesParRecette?: Record<string, number>
  /** Graine pour tests reproductibles */
  seed?: number
}

export interface PlanningCandidat {
  recetteIds: string[]
  fitness: number
  nutrition: number
  cout: number
  stock: number
  variete: number
  peremption: number
  preferences: number
  penalites: number
  respecteNutrition: boolean
  coutTotal: number
}

export interface OptimisationResultat {
  meilleur: PlanningCandidat
  dureeMs: number
  generations: number
  populationSize: number
  historiqueMeilleur: number[]
}
