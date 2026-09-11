import { describe, expect, it } from 'vitest'
import { mockDenrees, mockRecettes } from '@/data/mockData'
import { evaluerPlanning, optimiserPlanning } from '@/utils/menuOptimizer'

const portions = [180, 180, 180, 180, 180]

function baseCtx(overrides: Record<string, unknown> = {}) {
  return {
    recettes: mockRecettes.filter((r) => r.actif),
    denrees: mockDenrees.filter((d) => d.actif),
    prixUnitaireMoyen: {
      d1: 4500,
      d2: 5000,
      d3: 8000,
      d4: 2000,
      d5: 12000,
      d7: 3000,
      d8: 2500,
    },
    portionsParJour: portions,
    ...overrides,
  }
}

describe('menuOptimizer (US-41)', () => {
  it('génère une population initiale de 50 plannings', () => {
    const result = optimiserPlanning({
      ...baseCtx(),
      options: { populationSize: 50, generations: 1, seed: 42 },
    })
    expect(result.populationSize).toBe(50)
    expect(result.meilleur.recetteIds).toHaveLength(5)
  })

  it('conserve une recette verrouillée', () => {
    const result = optimiserPlanning({
      ...baseCtx(),
      options: {
        populationSize: 50,
        generations: 20,
        seed: 7,
        recettesVerrouillees: { 0: 'r2' },
      },
    })
    expect(result.meilleur.recetteIds[0]).toBe('r2')
  })

  it('conserve un jour verrouillé', () => {
    const result = optimiserPlanning({
      ...baseCtx(),
      planningActuel: ['r1', 'r2', 'r3', 'r4', 'r5'],
      options: {
        populationSize: 40,
        generations: 15,
        seed: 11,
        recettesVerrouillees: { 2: 'r3' },
        joursVerrouilles: [2],
      },
    })
    expect(result.meilleur.recetteIds[2]).toBe('r3')
  })

  it('évite la répétition de recettes sur 5 jours', () => {
    const result = optimiserPlanning({
      ...baseCtx(),
      options: { populationSize: 50, generations: 40, seed: 99 },
    })
    const unique = new Set(result.meilleur.recetteIds)
    expect(unique.size).toBe(5)
  })

  it('pénalise un planning avec stock insuffisant', () => {
    const denrees = mockDenrees.map((d) => ({ ...d, stockActuel: 0.01 }))
    const bad = evaluerPlanning(['r1', 'r2', 'r3', 'r4', 'r5'], {
      ...baseCtx(),
      denrees,
    })
    const good = evaluerPlanning(['r1', 'r2', 'r3', 'r4', 'r5'], baseCtx())
    expect(bad.stock).toBeLessThan(good.stock)
    expect(bad.penalites).toBeGreaterThan(good.penalites)
    expect(bad.fitness).toBeLessThan(good.fitness)
  })

  it('pénalise fortement un planning sous 90 % nutritionnel', () => {
    const weak = evaluerPlanning(['', '', '', '', ''], baseCtx())
    expect(weak.respecteNutrition).toBe(false)
    expect(weak.penalites).toBeGreaterThan(200)
  })

  it('favorise les denrées proches de la péremption (règle n°11)', () => {
    const withExpiry = evaluerPlanning(['r4', 'r5', 'r3', 'r2', 'r6'], baseCtx())
    expect(withExpiry.peremption).toBeGreaterThan(40)
  })

  it('est reproductible avec une graine fixe', () => {
    const a = optimiserPlanning({
      ...baseCtx(),
      options: { populationSize: 30, generations: 10, seed: 12345 },
    })
    const b = optimiserPlanning({
      ...baseCtx(),
      options: { populationSize: 30, generations: 10, seed: 12345 },
    })
    expect(a.meilleur.recetteIds).toEqual(b.meilleur.recetteIds)
    expect(a.meilleur.fitness).toBe(b.meilleur.fitness)
  })

  it('termine en moins de 10 secondes', () => {
    const result = optimiserPlanning({
      ...baseCtx(),
      options: { populationSize: 50, generations: 60, seed: 1 },
    })
    expect(result.dureeMs).toBeLessThan(10_000)
  })
})
