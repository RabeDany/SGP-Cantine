// ============================================================
// BASE DE CONNAISSANCES NUTRITIONNELLES — SGP-Cantine
// Enfants 6-12 ans · Seuils OMS · Denrées du référentiel
// ============================================================

export type Nutriments = 'calories' | 'proteines' | 'lipides' | 'glucides' | 'fer' | 'vitamineA'

export interface ValeursNutritionnelles {
  calories: number // kcal
  proteines: number // g
  lipides: number // g
  glucides: number // g
  fer: number // mg
  vitamineA: number // µg
}

/** Seuils OMS — apports nutritionnels recommandés pour un enfant de 6-12 ans par repas (1/3 des besoins journaliers) */
export const SEUILS_OMS_REPAS: ValeursNutritionnelles = {
  calories: 650, // 1950 kcal/j ÷ 3 repas
  proteines: 11.3, // 34 g/j ÷ 3
  lipides: 21.7, // 65 g/j ÷ 3
  glucides: 100, // 300 g/j ÷ 3
  fer: 4, // 12 mg/j ÷ 3
  vitamineA: 200, // 600 µg/j ÷ 3
}

export const NUTRIMENTS_LABELS: Record<Nutriments, string> = {
  calories: 'Calories (kcal)',
  proteines: 'Protéines (g)',
  lipides: 'Lipides (g)',
  glucides: 'Glucides (g)',
  fer: 'Fer (mg)',
  vitamineA: 'Vitamine A (µg)',
}

/**
 * Valeurs nutritionnelles pour 100g (ou 100 mL pour les liquides) de chaque denrée.
 * Sources : CIQUAL / FAO / tables de composition malgaches.
 */
export const VALEURS_NUTRITIONNELLES: Record<string, ValeursNutritionnelles> = {
  // d1 — Riz blanc (céréale)
  d1: { calories: 365, proteines: 7.1, lipides: 0.7, glucides: 80, fer: 0.8, vitamineA: 0 },
  // d2 — Haricots rouges (légumineuse)
  d2: { calories: 337, proteines: 22.5, lipides: 1.1, glucides: 61.3, fer: 6.9, vitamineA: 0 },
  // d3 — Huile de coco (huile)
  d3: { calories: 892, proteines: 0, lipides: 99, glucides: 0, fer: 0, vitamineA: 0 },
  // d4 — Laitue (légume)
  d4: { calories: 15, proteines: 1.4, lipides: 0.2, glucides: 2.9, fer: 0.9, vitamineA: 370 },
  // d5 — Poisson séché (protéine)
  d5: { calories: 350, proteines: 60, lipides: 10, glucides: 0, fer: 2.5, vitamineA: 15 },
  // d6 — Sel iodé (sel)
  d6: { calories: 0, proteines: 0, lipides: 0, glucides: 0, fer: 0, vitamineA: 0 },
  // d7 — Patate douce (légume)
  d7: { calories: 86, proteines: 1.6, lipides: 0.1, glucides: 20.1, fer: 0.6, vitamineA: 709 },
  // d8 — Manioc (céréale)
  d8: { calories: 160, proteines: 1.4, lipides: 0.3, glucides: 38.1, fer: 0.3, vitamineA: 0 },
}

/** Unités associées à chaque denrée pour affichage */
export const DENREE_UNITES: Record<string, string> = {
  d1: 'kg',
  d2: 'kg',
  d3: 'L',
  d4: 'kg',
  d5: 'kg',
  d6: 'kg',
  d7: 'kg',
  d8: 'kg',
}

export type CouvertureNutriment = {
  nutriment: Nutriments
  label: string
  apporte: number
  seuil: number
  pourcentage: number
  statut: 'ok' | 'insuffisant'
}

export interface BilanNutritionnelMenu {
  totalParNutriment: Record<Nutriments, number>
  portionsTotal: number
  couverture: CouvertureNutriment[]
  scoreGlobal: number // moyenne des couvertures en %
}

/**
 * Calcule la valeur nutritionnelle d'une quantité de denrée.
 * @param denreeId  identifiant de la denrée
 * @param quantite  quantité pour 100g/100mL (ex: 0.15 kg → 1.5 × valeurs pour 100g)
 */
export function calculerApportDenree(denreeId: string, quantite: number): ValeursNutritionnelles {
  const valeurs = VALEURS_NUTRITIONNELLES[denreeId]
  if (!valeurs) return { calories: 0, proteines: 0, lipides: 0, glucides: 0, fer: 0, vitamineA: 0 }
  const facteur = quantite * 10 // 100 g → ×10 pour obtenir kcal par kg
  return {
    calories: valeurs.calories * facteur,
    proteines: valeurs.proteines * facteur,
    lipides: valeurs.lipides * facteur,
    glucides: valeurs.glucides * facteur,
    fer: valeurs.fer * facteur,
    vitamineA: valeurs.vitamineA * facteur,
  }
}