const STORAGE_PREFIX = 'sgp-cantine-'

export interface StockReportItem {
  id: string
  nom: string
  unite: string
  stockActuel: number
  seuilAlerte: number
  categorie: string
  actif: boolean
  dureeConservationJours: number
}

export interface StockReportData {
  period: string
  totalItems: number
  movementsCount: number
  lowStockItems: Array<{
    id: string
    nom: string
    unite: string
    stockActuel: number
    seuilAlerte: number
  }>
  summary: Array<{ label: string; value: string }>
}

export interface AttendanceReportData {
  period: string
  totalMealsServed: number
  averageAttendanceRate: number
  absentRate: number
  dailyRows: Array<{ date: string; presents: number; inscrits: number; rate: number }>
}

export interface MenuReportData {
  week: string
  totalPortions: number
  mealsByDay: Array<{ day: string; recette: string; portions: number }>
  ingredients: Array<{ denree: string; unite: string; quantite: number }>
}

export interface ConsumptionReportItem {
  denreeId: string
  denree: string
  unite: string
  quantity: number
  mealsServed: number
  ratio: number
}

export interface ConsumptionReportData {
  period: string
  totalMealsServed: number
  totalConsumed: number
  items: ConsumptionReportItem[]
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function hashPassword(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `h_${hash.toString(16)}`
}

export function createMockJwt(userId: string, expiresAt: number): string {
  return `mockjwt.${userId}.${expiresAt}`
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function buildStockReportData(
  denrees: StockReportItem[],
  mouvements: Array<{ denreeId: string; type: 'entree' | 'sortie'; quantite: number }>,
  period: string,
): StockReportData {
  const lowStockItems = denrees
    .filter((denree) => denree.stockActuel <= denree.seuilAlerte)
    .map((denree) => ({
      id: denree.id,
      nom: denree.nom,
      unite: denree.unite,
      stockActuel: denree.stockActuel,
      seuilAlerte: denree.seuilAlerte,
    }))

  const totalSorties = mouvements.filter((m) => m.type === 'sortie').reduce((sum, m) => sum + m.quantite, 0)
  const totalEntrees = mouvements.filter((m) => m.type === 'entree').reduce((sum, m) => sum + m.quantite, 0)

  return {
    period,
    totalItems: denrees.length,
    movementsCount: mouvements.length,
    lowStockItems,
    summary: [
      { label: 'Entrées', value: formatNumber(totalEntrees, 0) },
      { label: 'Sorties', value: formatNumber(totalSorties, 0) },
      { label: 'Denrées sous seuil', value: String(lowStockItems.length) },
    ],
  }
}

export function buildAttendanceReportData(
  pointages: Array<{ date: string; presents: number; inscrits: number }>,
  totalInscrits: number,
): AttendanceReportData {
  const dailyRows = pointages.map((p) => ({
    date: p.date,
    presents: p.presents,
    inscrits: p.inscrits,
    rate: Number(((p.presents / p.inscrits) * 100).toFixed(1)),
  }))

  const totalMealsServed = dailyRows.reduce((sum, row) => sum + row.presents, 0)
  const averageAttendanceRate = dailyRows.length
    ? Number((dailyRows.reduce((sum, row) => sum + row.rate, 0) / dailyRows.length).toFixed(1))
    : 0
  const absentRate = totalInscrits ? Number((((totalInscrits * dailyRows.length) - totalMealsServed) / (totalInscrits * dailyRows.length) * 100).toFixed(1)) : 0

  return {
    period: 'Période sélectionnée',
    totalMealsServed,
    averageAttendanceRate,
    absentRate,
    dailyRows,
  }
}

export function buildMenuReportData(
  menu: { semaineDebut: string; jours: Array<{ jour: number; recetteId: string | null; portionsPrevues: number }> },
  recettes: Array<{ id: string; nom: string; ingredients: Array<{ denreeId: string; quantiteParPortion: number }> }>,
  denreesById: Record<string, { nom: string; unite: string }>,
  totalPortions: number,
): MenuReportData {
  const mealsByDay = menu.jours
    .filter((jour) => jour.recetteId)
    .map((jour) => {
      const recette = recettes.find((item) => item.id === jour.recetteId)
      return {
        day: `Jour ${jour.jour + 1}`,
        recette: recette?.nom ?? 'Sans recette',
        portions: jour.portionsPrevues,
      }
    })

  const ingredientTotals = new Map<string, number>()
  menu.jours.forEach((jour) => {
    const recette = recettes.find((item) => item.id === jour.recetteId)
    if (!recette) return
    recette.ingredients.forEach((ingredient) => {
      ingredientTotals.set(
        ingredient.denreeId,
        (ingredientTotals.get(ingredient.denreeId) ?? 0) + ingredient.quantiteParPortion * jour.portionsPrevues,
      )
    })
  })

  return {
    week: menu.semaineDebut,
    totalPortions,
    mealsByDay,
    ingredients: Array.from(ingredientTotals.entries()).map(([denreeId, quantite]) => ({
      denree: denreesById[denreeId]?.nom ?? denreeId,
      unite: denreesById[denreeId]?.unite ?? 'unite',
      quantite: Number(quantite.toFixed(3)),
    })),
  }
}

export function buildConsumptionReportData(
  denrees: Array<{ id: string; nom: string; unite: string }>,
  mouvements: Array<{ denreeId: string; type: 'entree' | 'sortie'; quantite: number; date: string; motif?: string }>,
  pointages: Array<{ date: string; presents: number }>,
  period: string,
): ConsumptionReportData {
  const periodLabel = period || 'Période sélectionnée'
  const mealsServed = pointages
    .filter((pointage) => pointage.date.startsWith(periodLabel === 'Période sélectionnée' ? '' : period))
    .reduce((sum, pointage) => sum + pointage.presents, 0)

  const totals = new Map<string, { denreeId: string; denree: string; unite: string; quantity: number }>()

  mouvements
    .filter((mouvement) => mouvement.type === 'sortie')
    .filter((mouvement) => (period === 'Période sélectionnée' ? true : mouvement.date.startsWith(period)))
    .forEach((mouvement) => {
      const denree = denrees.find((item) => item.id === mouvement.denreeId)
      if (!denree) return

      const current = totals.get(denree.id) ?? {
        denreeId: denree.id,
        denree: denree.nom,
        unite: denree.unite,
        quantity: 0,
      }

      current.quantity += mouvement.quantite
      totals.set(denree.id, current)
    })

  const items = Array.from(totals.values())
    .map((item) => ({
      denreeId: item.denreeId,
      denree: item.denree,
      unite: item.unite,
      quantity: item.quantity,
      mealsServed: mealsServed || 0,
      ratio: mealsServed > 0 ? Number((item.quantity / mealsServed).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)

  return {
    period: periodLabel,
    totalMealsServed: mealsServed,
    totalConsumed: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  }
}

export function validateInventoryEntries(rows: Array<{ denreeId: string; nom: string; unite: string; stockTheorique: number; stockPhysique: number; commentaire: string }>) {
  return rows.map((row) => {
    const ecart = row.stockPhysique - row.stockTheorique
    const tauxEcartPct = row.stockTheorique
      ? Number(((Math.abs(ecart) / row.stockTheorique) * 100).toFixed(1))
      : 0
    const requiresComment = ecart !== 0
    const errors: string[] = []

    if (requiresComment && !row.commentaire.trim()) {
      errors.push('Un commentaire est obligatoire pour tout écart entre stock physique et stock théorique.')
    }

    return {
      ...row,
      ecart,
      tauxEcartPct,
      requiresComment,
      errors,
    }
  })
}

export function toCsv(rows: Array<Record<string, string | number | boolean>>): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(
      headers
        .map((header) => {
          const value = row[header]
          const normalized = String(value).replace(/"/g, '""')
          return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
        })
        .join(','),
    )
  })
  return lines.join('\n')
}

export const HEURE_CANTINE_DEBUT = 10
export const HEURE_CANTINE_FIN = 14
export const SEUIL_POINTAGE_EXCESSIF = 0.2

export function estDansPlageHoraireCantine(date = new Date()): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return minutes >= HEURE_CANTINE_DEBUT * 60 && minutes <= HEURE_CANTINE_FIN * 60
}

export function depasseSeuilPointage(presents: number, inscrits: number, seuil = SEUIL_POINTAGE_EXCESSIF): boolean {
  if (inscrits <= 0) return presents > 0
  return presents > inscrits * (1 + seuil)
}
