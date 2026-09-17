import {
  SEUILS_OMS_REPAS,
  calculerApportDenree,
  type Nutriments,
  type ValeursNutritionnelles,
} from '@/knowledge base/nutrition-knowledge-base'
import type { Denree, Recette } from '@/types'
import type {
  OptimisationOptions,
  OptimisationResultat,
  PlanningCandidat,
} from '@/types/optimisation'

const JOURS = 5
const ALL_NUTRIMENTS: Nutriments[] = [
  'calories',
  'proteines',
  'lipides',
  'glucides',
  'fer',
  'vitamineA',
]
const DEFAULT_PREF = 0.5
const PRIX_DEFAUT_PAR_KG = 3000

export interface OptimisationContext {
  recettes: Recette[]
  denrees: Denree[]
  prixUnitaireMoyen: Record<string, number>
  portionsParJour: number[]
  /** Planning courant — utilisé pour respecter `joursVerrouilles` */
  planningActuel?: string[]
  options?: OptimisationOptions
}

function createRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function emptyNutriments(): ValeursNutritionnelles {
  return { calories: 0, proteines: 0, lipides: 0, glucides: 0, fer: 0, vitamineA: 0 }
}

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function locksMap(options?: OptimisationOptions): Map<number, string> {
  const map = new Map<number, string>()
  if (options?.recettesVerrouillees) {
    for (const [k, v] of Object.entries(options.recettesVerrouillees)) {
      map.set(Number(k), v)
    }
  }
  return map
}

function lockedDays(options?: OptimisationOptions): Set<number> {
  return new Set(options?.joursVerrouilles ?? [])
}

function isDayLocked(day: number, locks: Map<number, string>, days: Set<number>) {
  return days.has(day) || locks.has(day)
}

function hasRepeatInWindow(ids: string[]): boolean {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!id) continue
    if (seen.has(id)) return true
    seen.add(id)
  }
  return false
}

function applyLocks(
  ids: string[],
  locks: Map<number, string>,
  days: Set<number>,
  base?: string[],
): string[] {
  const next = [...ids]
  for (let d = 0; d < JOURS; d += 1) {
    if (locks.has(d)) next[d] = locks.get(d)!
    else if (days.has(d) && base?.[d]) next[d] = base[d]
  }
  return next
}

/** Répare les doublons sans toucher aux verrous. */
function repairDuplicates(
  ids: string[],
  pool: string[],
  locks: Map<number, string>,
  days: Set<number>,
  rng: () => number,
  base?: string[],
): string[] {
  let next = applyLocks(ids, locks, days, base)
  const used = new Set<string>()
  for (let d = 0; d < JOURS; d += 1) {
    const id = next[d]
    if (!id) continue
    if (!used.has(id)) {
      used.add(id)
      continue
    }
    if (isDayLocked(d, locks, days)) continue
    const alternatives = shuffle(
      pool.filter((r) => !used.has(r)),
      rng,
    )
    if (alternatives.length) {
      next[d] = alternatives[0]
      used.add(alternatives[0])
    }
  }
  return applyLocks(next, locks, days, base)
}

function randomChromosome(
  pool: string[],
  locks: Map<number, string>,
  days: Set<number>,
  rng: () => number,
  base?: string[],
): string[] {
  const shuffled = shuffle(pool, rng)
  const ids: string[] = []
  for (let d = 0; d < JOURS; d += 1) {
    if (locks.has(d)) ids[d] = locks.get(d)!
    else if (days.has(d) && base?.[d]) ids[d] = base[d]
    else ids[d] = shuffled[d % shuffled.length] ?? pickRandom(pool, rng)
  }
  return repairDuplicates(ids, pool, locks, days, rng, base)
}

function calculerBesoins(
  recetteIds: string[],
  recettesById: Map<string, Recette>,
  portionsParJour: number[],
): Map<string, number> {
  const besoins = new Map<string, number>()
  for (let d = 0; d < JOURS; d += 1) {
    const recette = recettesById.get(recetteIds[d])
    if (!recette) continue
    const portions = portionsParJour[d] ?? 0
    for (const ing of recette.ingredients) {
      besoins.set(
        ing.denreeId,
        (besoins.get(ing.denreeId) ?? 0) + ing.quantiteParPortion * portions,
      )
    }
  }
  return besoins
}

export function evaluerPlanning(
  recetteIds: string[],
  ctx: OptimisationContext,
): PlanningCandidat {
  const options = ctx.options ?? {}
  const recettesById = new Map(ctx.recettes.map((r) => [r.id, r]))
  const denreesById = new Map(ctx.denrees.map((d) => [d.id, d]))
  const locks = locksMap(options)
  const days = lockedDays(options)
  const prefs = options.preferencesParRecette ?? {}

  let penalites = 0

  for (const [day, recetteId] of locks.entries()) {
    if (recetteIds[day] !== recetteId) penalites += 1000
  }
  for (const day of days) {
    if (!recetteIds[day]) penalites += 500
  }

  if (hasRepeatInWindow(recetteIds)) penalites += 400

  const uniqueCount = new Set(recetteIds.filter(Boolean)).size
  const variete = Math.min(100, (uniqueCount / JOURS) * 100)

  const total = emptyNutriments()
  let portionsTotal = 0
  for (let d = 0; d < JOURS; d += 1) {
    const recette = recettesById.get(recetteIds[d])
    if (!recette) {
      penalites += 200
      continue
    }
    const portions = ctx.portionsParJour[d] ?? 0
    portionsTotal += portions
    for (const ing of recette.ingredients) {
      const apport = calculerApportDenree(ing.denreeId, ing.quantiteParPortion)
      for (const n of ALL_NUTRIMENTS) {
        total[n] += apport[n] * portions
      }
    }
  }

  const moyenne =
    portionsTotal > 0
      ? {
          calories: total.calories / portionsTotal,
          proteines: total.proteines / portionsTotal,
          lipides: total.lipides / portionsTotal,
          glucides: total.glucides / portionsTotal,
          fer: total.fer / portionsTotal,
          vitamineA: total.vitamineA / portionsTotal,
        }
      : emptyNutriments()

  const couvertures = ALL_NUTRIMENTS.map((n) => {
    const seuil = SEUILS_OMS_REPAS[n]
    return seuil > 0 ? Math.min(100, (moyenne[n] / seuil) * 100) : 0
  })
  const nutrition = Number(
    (couvertures.reduce((a, b) => a + b, 0) / couvertures.length).toFixed(2),
  )
  const respecteNutrition = couvertures.every((c) => c >= 90)
  if (!respecteNutrition) {
    const deficit = Math.max(0, 90 - nutrition)
    penalites += 250 + deficit * 3
  }

  const besoins = calculerBesoins(recetteIds, recettesById, ctx.portionsParJour)
  let besoinTotal = 0
  let disponibleTotal = 0
  let manquant = 0
  for (const [denreeId, qte] of besoins.entries()) {
    const denree = denreesById.get(denreeId)
    const stockQty = denree?.stockActuel ?? 0
    besoinTotal += qte
    disponibleTotal += Math.min(stockQty, qte)
    if (qte > stockQty) manquant += qte - stockQty
  }
  const stock = besoinTotal > 0 ? Math.min(100, (disponibleTotal / besoinTotal) * 100) : 0
  if (manquant > 0) penalites += 150 + manquant * 2

  let coutTotal = 0
  for (const [denreeId, qte] of besoins.entries()) {
    const prix = ctx.prixUnitaireMoyen[denreeId] ?? PRIX_DEFAUT_PAR_KG
    coutTotal += qte * prix
  }
  if (options.budgetMaximum != null && coutTotal > options.budgetMaximum) {
    penalites += 100 + ((coutTotal - options.budgetMaximum) / options.budgetMaximum) * 100
  }
  const budgetRef = options.budgetMaximum ?? Math.max(coutTotal, 1) * 1.2
  const cout = Math.max(0, Math.min(100, 100 - (coutTotal / budgetRef) * 100 + 20))

  let peremptionScore = 0
  let peremptionWeight = 0
  for (const [denreeId, qte] of besoins.entries()) {
    const denree = denreesById.get(denreeId)
    if (!denree || qte <= 0) continue
    const jours = daysUntil(denree.datePeremption)
    let score = 40
    if (jours != null) {
      if (jours <= 7) score = 100
      else if (jours <= 14) score = 80
      else if (jours <= 30) score = 60
      else score = 30
    }
    peremptionScore += score * qte
    peremptionWeight += qte
  }
  const peremption = peremptionWeight > 0 ? peremptionScore / peremptionWeight : 40

  const prefValues = recetteIds.map((id) => prefs[id] ?? DEFAULT_PREF)
  const preferences = prefValues.length
    ? (prefValues.reduce((a, b) => a + b, 0) / prefValues.length) * 100
    : DEFAULT_PREF * 100

  const fitnessRaw =
    nutrition * 0.4 +
    cout * 0.2 +
    stock * 0.15 +
    peremption * 0.15 +
    variete * 0.05 +
    preferences * 0.05 -
    penalites

  return {
    recetteIds: [...recetteIds],
    fitness: Number(fitnessRaw.toFixed(2)),
    nutrition: Number(nutrition.toFixed(2)),
    cout: Number(cout.toFixed(2)),
    stock: Number(stock.toFixed(2)),
    variete: Number(variete.toFixed(2)),
    peremption: Number(peremption.toFixed(2)),
    preferences: Number(preferences.toFixed(2)),
    penalites: Number(penalites.toFixed(2)),
    respecteNutrition,
    coutTotal: Number(coutTotal.toFixed(0)),
  }
}

function tournament(pop: PlanningCandidat[], rng: () => number, k = 3): PlanningCandidat {
  let best = pickRandom(pop, rng)
  for (let i = 1; i < k; i += 1) {
    const cand = pickRandom(pop, rng)
    if (cand.fitness > best.fitness) best = cand
  }
  return best
}

function crossover(
  a: string[],
  b: string[],
  locks: Map<number, string>,
  days: Set<number>,
  rng: () => number,
  base?: string[],
): string[] {
  const point = 1 + Math.floor(rng() * (JOURS - 1))
  const child = [...a.slice(0, point), ...b.slice(point)]
  return applyLocks(child, locks, days, base)
}

function mutate(
  ids: string[],
  pool: string[],
  locks: Map<number, string>,
  days: Set<number>,
  rng: () => number,
  rate: number,
  base?: string[],
): string[] {
  const next = [...ids]
  for (let d = 0; d < JOURS; d += 1) {
    if (isDayLocked(d, locks, days)) continue
    if (rng() < rate) next[d] = pickRandom(pool, rng)
  }
  return repairDuplicates(next, pool, locks, days, rng, base)
}

/**
 * Algorithme génétique — menu hebdomadaire optimal (US-41 / §3.5).
 * Pur métier : pas de Vue / Pinia.
 */
export function optimiserPlanning(ctx: OptimisationContext): OptimisationResultat {
  const started = performance.now()
  const options = ctx.options ?? {}
  const populationSize = options.populationSize ?? 50
  const generations = options.generations ?? 60
  const rng = createRng(options.seed ?? Date.now())
  const locks = locksMap(options)
  const days = lockedDays(options)
  const pool = ctx.recettes.filter((r) => r.actif).map((r) => r.id)

  if (pool.length === 0) {
    const empty = evaluerPlanning(Array(JOURS).fill(''), ctx)
    return {
      meilleur: empty,
      meilleurs: [empty],
      dureeMs: performance.now() - started,
      generations: 0,
      populationSize,
      historiqueMeilleur: [],
    }
  }

  const base =
    ctx.planningActuel && ctx.planningActuel.length === JOURS
      ? [...ctx.planningActuel]
      : Array.from({ length: JOURS }, (_, i) => locks.get(i) ?? pool[i % pool.length])

  for (const day of days) {
    if (!base[day] && locks.has(day)) base[day] = locks.get(day)!
  }

  let population: PlanningCandidat[] = []
  for (let i = 0; i < populationSize; i += 1) {
    const chrom = randomChromosome(pool, locks, days, rng, base)
    population.push(evaluerPlanning(chrom, { ...ctx, options }))
  }
  population.sort((a, b) => b.fitness - a.fitness)

  const historiqueMeilleur: number[] = [population[0].fitness]

  for (let g = 0; g < generations; g += 1) {
    const nextGen: PlanningCandidat[] = []
    nextGen.push(population[0])
    nextGen.push(population[1] ?? population[0])

    while (nextGen.length < populationSize) {
      const p1 = tournament(population, rng)
      const p2 = tournament(population, rng)
      let childIds = crossover(p1.recetteIds, p2.recetteIds, locks, days, rng, base)
      childIds = mutate(childIds, pool, locks, days, rng, 0.2, base)
      nextGen.push(evaluerPlanning(childIds, { ...ctx, options }))
    }

    population = nextGen.sort((a, b) => b.fitness - a.fitness)
    historiqueMeilleur.push(population[0].fitness)
  }

  const meilleurs = Array.from(
    new Map(population.map((candidat) => [candidat.recetteIds.join('|'), candidat])).values(),
  )
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, 5)

  return {
    meilleur: population[0],
    meilleurs,
    dureeMs: Number((performance.now() - started).toFixed(1)),
    generations,
    populationSize,
    historiqueMeilleur,
  }
}
