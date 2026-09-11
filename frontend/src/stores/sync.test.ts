import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCommunalStore } from './communal'
import { useSyncStore } from './sync'
import type { SyncPackage } from '@/types/sync'

const storage = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

function calculateChecksum(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`
}

describe('synchronisation multi-sites', () => {
  beforeEach(() => {
    storage.clear()
    setActivePinia(createPinia())
  })

  it('exporte un paquet incrémental vérifiable', () => {
    storage.set('sgp-cantine-denrees', JSON.stringify([
      {
        id: 'd-test',
        nom: 'Riz test',
        categorie: 'cereale',
        unite: 'kg',
        seuilAlerte: 10,
        dureeConservationJours: 30,
        stockActuel: 20,
        actif: true,
      },
    ]))
    const store = useSyncStore()
    const paquet = store.exporterDepuisDerniereSynchronisation()

    expect(paquet.version).toBe(1)
    expect(paquet.sourceSite.id).toBe('site-local')
    expect(paquet.changes.length).toBeGreaterThan(0)
    expect(store.verifierPaquet(paquet)).toBe(true)
  })

  it('importe un site distant et alimente les rapports communaux', () => {
    const syncStore = useSyncStore()
    const localPackage = syncStore.exporterDepuisDerniereSynchronisation()
    const distantPackage = {
      ...localPackage,
      packageId: 'sync_remote_1',
      sourceSite: { ...localPackage.sourceSite, id: 'site-remote', nom: 'EPP distante' },
    }
    const { checksum: _checksum, ...content } = distantPackage
    const validPackage: SyncPackage = {
      ...distantPackage,
      checksum: calculateChecksum(content),
    }

    const result = syncStore.importerPaquet(validPackage)
    const communalStore = useCommunalStore()

    expect(result.ok).toBe(true)
    expect(syncStore.sitesImportes.map((site) => site.id)).toContain('site-remote')
    expect(communalStore.ecoles.map((ecole) => ecole.id)).toEqual(['site-remote'])
    expect(communalStore.commandesGroupees.length).toBeGreaterThanOrEqual(0)
  })
})
