import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnomalieStore } from './anomalie'
import { usePresenceStore } from './presence'
import { useStockStore } from './stock'
import { todayISO } from '@/utils/helpers'

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

describe('anomalie store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('détecte un écart d\'inventaire > 10% en niveau 2 (avertissement)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 88 },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(2)
    expect(detectees[0].type).toBe('ecart_inventaire')
  })

  it('bloque un pointage > 20% des inscrits (niveau 3)', () => {
    const presence = usePresenceStore()
    const anomalie = useAnomalieStore()
    const inscrits = presence.totalInscrits
    const presents = Math.floor(inscrits * 1.2) + 1

    const result = presence.enregistrerPointageGlobal(
      { presents, exemptions: 0, userId: 'u4' },
      { id: 'u4', nom: 'Agent', role: 'agent' },
    )

    expect(result.ok).toBe(false)
    expect(anomalie.anomaliesNiveau3).toHaveLength(1)
    expect(anomalie.anomaliesNiveau3[0].type).toBe('pointage_excessif')
    expect(presence.pointageEffectue).toBe(false)
  })

  it('autorise un pointage excessif après justification admin', () => {
    const presence = usePresenceStore()
    const anomalie = useAnomalieStore()
    const inscrits = presence.totalInscrits
    const presents = Math.floor(inscrits * 1.2) + 1
    const userAgent = { id: 'u4', nom: 'Agent', role: 'agent' as const }
    const userAdmin = { id: 'u1', nom: 'Directeur', role: 'admin' as const }

    presence.enregistrerPointageGlobal({ presents, exemptions: 0, userId: 'u4' }, userAgent)
    const anomalieId = anomalie.anomaliesNiveau3[0].id

    const justify = anomalie.mettreAJourStatut(anomalieId, 'justifiee', userAdmin, 'Erreur de saisie corrigée')
    expect(justify.ok).toBe(true)

    const retry = presence.enregistrerPointageGlobal({ presents, exemptions: 0, userId: 'u4' }, userAgent)
    expect(retry.ok).toBe(true)
    expect(presence.totalPresentsAujourdhui).toBe(presents)
  })

  it('refuse la justification niveau 3 sans texte', () => {
    const presence = usePresenceStore()
    const anomalie = useAnomalieStore()
    const inscrits = presence.totalInscrits
    const presents = Math.floor(inscrits * 1.2) + 1

    presence.enregistrerPointageGlobal({ presents, exemptions: 0, userId: 'u4' })
    const result = anomalie.mettreAJourStatut(
      anomalie.anomaliesNiveau3[0].id,
      'justifiee',
      { id: 'u1', nom: 'Directeur', role: 'admin' },
      '   ',
    )
    expect(result.ok).toBe(false)
  })

  it('bloque une sortie hors plage 10h–14h (niveau 3)', () => {
    const stock = useStockStore()
    const anomalie = useAnomalieStore()
    const denree = stock.denreesAvecStatut[0]
    const evening = new Date()
    evening.setHours(16, 30, 0, 0)

    const result = stock.enregistrerSortie(
      {
        denreeId: denree.id,
        date: todayISO(),
        quantite: 1,
        motif: 'preparation_repas',
        userId: 'u2',
      },
      { id: 'u2', nom: 'Stock', role: 'gestionnaire' },
      { now: evening },
    )

    expect(result.ok).toBe(false)
    expect(anomalie.anomaliesNiveau3.some((a) => a.type === 'sortie_hors_horaire')).toBe(true)
  })

  it('autorise une sortie dans la plage 10h–14h', () => {
    const stock = useStockStore()
    const anomalie = useAnomalieStore()
    const denree = stock.denreesAvecStatut[0]
    const noon = new Date()
    noon.setHours(12, 0, 0, 0)
    const avant = denree.stockActuel

    const result = stock.enregistrerSortie(
      {
        denreeId: denree.id,
        date: todayISO(),
        quantite: 1,
        motif: 'preparation_repas',
        userId: 'u2',
      },
      { id: 'u2', nom: 'Stock', role: 'gestionnaire' },
      { now: noon },
    )

    expect(result.ok).toBe(true)
    expect(stock.getDenree(denree.id)?.stockActuel).toBe(avant - 1)
    expect(anomalie.anomalies.filter((a) => a.type === 'sortie_hors_horaire')).toHaveLength(0)
  })

  it('autorise une sortie hors horaire après justification', () => {
    const stock = useStockStore()
    const anomalie = useAnomalieStore()
    const denree = stock.denreesAvecStatut[0]
    const evening = new Date()
    evening.setHours(17, 0, 0, 0)
    const user = { id: 'u2', nom: 'Stock', role: 'gestionnaire' as const }
    const admin = { id: 'u1', nom: 'Directeur', role: 'admin' as const }

    stock.enregistrerSortie(
      {
        denreeId: denree.id,
        date: todayISO(),
        quantite: 1,
        motif: 'preparation_repas',
        userId: 'u2',
      },
      user,
      { now: evening },
    )

    const blocked = anomalie.anomaliesNiveau3.find((a) => a.type === 'sortie_hors_horaire')!
    anomalie.mettreAJourStatut(blocked.id, 'justifiee', admin, 'Transfert urgent validé')

    const retry = stock.enregistrerSortie(
      {
        denreeId: denree.id,
        date: todayISO(),
        quantite: 1,
        motif: 'preparation_repas',
        userId: 'u2',
      },
      user,
      { now: evening },
    )
    expect(retry.ok).toBe(true)
  })

  it('détecte une consommation > 150% (niveau 2)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterConsommationAnormale([
      {
        denreeId: 'd1',
        nom: 'Riz',
        unite: 'kg',
        quantitePeriode: 60,
        moyenne4Semaines: 30,
        nbEleves: 180,
      },
    ])

    expect(detectees).toHaveLength(1)
    expect(detectees[0].niveau).toBe(2)
  })

  it('met à jour le statut d\'une anomalie niveau 2 (admin uniquement)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 40 },
    ])

    const refused = store.mettreAJourStatut(
      detectees[0].id,
      'justifiee',
      { id: 'u_inspecteur', nom: 'Inspecteur', role: 'inspecteur' },
    )
    expect(refused.ok).toBe(false)

    const ok = store.mettreAJourStatut(
      detectees[0].id,
      'justifiee',
      { id: 'u1', nom: 'Directeur', role: 'admin' },
    )
    expect(ok.ok).toBe(true)
    expect(store.getAnomalie(detectees[0].id)?.statut).toBe('justifiee')
  })

  it('refuse toute modification de statut sans rôle admin (US-38)', () => {
    const store = useAnomalieStore()
    const detectees = store.detecterEcartInventaire([
      { denreeId: 'd1', nom: 'Riz', unite: 'kg', stockTheorique: 100, stockPhysique: 80 },
    ])

    expect(store.mettreAJourStatut(detectees[0].id, 'non_justifiee').ok).toBe(false)
    expect(
      store.mettreAJourStatut(
        detectees[0].id,
        'non_justifiee',
        { id: 'u4', nom: 'Agent', role: 'agent' },
      ).ok,
    ).toBe(false)
  })
})
