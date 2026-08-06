import { describe, expect, it } from 'vitest'
import { buildAttendanceReportData, buildMenuReportData, buildStockReportData, toCsv, validateInventoryEntries } from './helpers'

describe('report helpers', () => {
  it('buildStockReportData returns monthly summary and low stock items', () => {
    const data = buildStockReportData([
      { id: 'd1', nom: 'Riz', unite: 'kg', stockActuel: 20, seuilAlerte: 50, categorie: 'cereale', actif: true, dureeConservationJours: 30 },
      { id: 'd2', nom: 'Poisson', unite: 'kg', stockActuel: 4, seuilAlerte: 8, categorie: 'proteine', actif: true, dureeConservationJours: 30 },
    ], [
      { id: 'm1', denreeId: 'd1', type: 'entree', date: '2026-07-15', quantite: 40, userId: 'u1', createdAt: '2026-07-15T10:00:00' },
      { id: 'm2', denreeId: 'd1', type: 'sortie', date: '2026-07-16', quantite: 20, userId: 'u1', createdAt: '2026-07-16T10:00:00' },
      { id: 'm3', denreeId: 'd2', type: 'sortie', date: '2026-07-16', quantite: 4, userId: 'u1', createdAt: '2026-07-16T10:00:00' },
    ], '2026-07')

    expect(data.period).toBe('2026-07')
    expect(data.lowStockItems).toHaveLength(2)
    expect(data.lowStockItems.map((item) => item.nom)).toEqual(['Riz', 'Poisson'])
    expect(data.movementsCount).toBe(3)
  })

  it('buildAttendanceReportData computes attendance metrics', () => {
    const data = buildAttendanceReportData([
      { id: 'p1', date: '2026-07-20', classeId: null, presents: 180, inscrits: 220, exemptions: 5, userId: 'u4', createdAt: '2026-07-20T10:00:00' },
      { id: 'p2', date: '2026-07-21', classeId: null, presents: 160, inscrits: 220, exemptions: 6, userId: 'u4', createdAt: '2026-07-21T10:00:00' },
    ], 220)

    expect(data.averageAttendanceRate).toBe(77.3)
    expect(data.totalMealsServed).toBe(340)
    expect(data.absentRate).toBe(22.7)
  })

  it('buildMenuReportData aggregates ingredients by week', () => {
    const data = buildMenuReportData(
      {
        id: 'menu1',
        semaineDebut: '2026-07-20',
        jours: [
          { jour: 0, recetteId: 'r1', portionsPrevues: 100 },
          { jour: 1, recetteId: 'r2', portionsPrevues: 80 },
        ],
        valide: false,
      },
      [
        { id: 'r1', nom: 'Riz au haricot', categorie: 'dejeuner', ingredients: [{ denreeId: 'd1', quantiteParPortion: 0.15 }], instructions: '', actif: true },
        { id: 'r2', nom: 'Riz poisson', categorie: 'dejeuner', ingredients: [{ denreeId: 'd1', quantiteParPortion: 0.1 }, { denreeId: 'd5', quantiteParPortion: 0.04 }], instructions: '', actif: true },
      ],
      {
        d1: { nom: 'Riz', unite: 'kg', stockActuel: 20 },
        d5: { nom: 'Poisson', unite: 'kg', stockActuel: 5 },
      },
      220,
    )

    expect(data.totalPortions).toBe(220)
    expect(data.ingredients[0].quantite).toBe(0.15 * 100 + 0.1 * 80)
    expect(data.mealsByDay).toHaveLength(2)
  })

  it('validateInventoryEntries flags any variance and requires a comment', () => {
    const rows = validateInventoryEntries([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 96, commentaire: '' },
      { denreeId: 'd2', nom: 'Poisson', unite: 'kg', stockTheorique: 100, stockPhysique: 70, commentaire: '' },
    ])

    expect(rows[0].ecart).toBe(-4)
    expect(rows[0].tauxEcartPct).toBe(4)
    expect(rows[0].requiresComment).toBe(true)
    expect(rows[1].requiresComment).toBe(true)
    expect(rows[0].errors).toContain('Un commentaire est obligatoire pour tout écart entre stock physique et stock théorique.')
  })

  it('toCsv renders a simple csv payload', () => {
    const csv = toCsv([
      { nom: 'Riz', stock: 20 },
      { nom: 'Poisson', stock: 10 },
    ])

    expect(csv).toContain('nom,stock')
    expect(csv).toContain('Riz,20')
  })
})
