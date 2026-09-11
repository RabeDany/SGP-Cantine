import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ECOLE_INFO } from '@/data/mockData'
import { loadFromStorage, saveToStorage, generateId } from '@/utils/helpers'
import type { BonCommande, Classe, Denree, Fournisseur, MenuHebdo, MouvementStock, PointagePresence, Recette } from '@/types'
import type {
  ImportedSiteData,
  SyncChange,
  SyncConflict,
  SyncEntity,
  SyncPackage,
  SyncSite,
  SyncSnapshot,
} from '@/types/sync'

const SITE_ID = 'site-local'
const STORAGE_IMPORTS = 'sync_imported_sites'
const STORAGE_CONFLICTS = 'sync_conflicts'
const STORAGE_EXPORT_SNAPSHOT = 'sync_last_export_snapshot'
const STORAGE_LAST_EXPORT = 'sync_last_export_at'

function checksum(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`
}

function asArray<T>(key: string, fallback: T[]): T[] {
  return loadFromStorage<T[]>(key, fallback)
}

function getEntityId(item: Record<string, unknown>, index: number): string {
  return typeof item.id === 'string' ? item.id : `${index}`
}

function createSnapshot(): SyncSnapshot {
  const fallbackMenu = loadFromStorage<MenuHebdo | null>('menu', null)
  return {
    denrees: asArray<Denree>('denrees', []),
    mouvements: asArray<MouvementStock>('mouvements', []),
    menus: asArray<MenuHebdo>('menus', fallbackMenu ? [fallbackMenu] : []),
    pointages: asArray<PointagePresence>('pointages', []),
    recettes: asArray<Recette>('recettes', []),
    fournisseurs: asArray<Fournisseur>('fournisseurs', []),
    commandes: asArray<BonCommande>('bonsCommande', []),
    classes: asArray<Classe>('classes', []),
  }
}

function diffSnapshots(previous: SyncSnapshot | null, current: SyncSnapshot): SyncChange[] {
  const changes: SyncChange[] = []
  const entities = Object.keys(current) as SyncEntity[]

  for (const entity of entities) {
    const previousItems = new Map((previous?.[entity] ?? []).map((item, index) => [getEntityId(item as unknown as Record<string, unknown>, index), item]))
    const currentItems = new Map(current[entity].map((item, index) => [getEntityId(item as unknown as Record<string, unknown>, index), item]))

    for (const [entityId, item] of currentItems) {
      const oldItem = previousItems.get(entityId)
      if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
        changes.push({
          changeId: generateId('change'),
          entity,
          entityId,
          operation: oldItem ? 'update' : 'create',
          payload: item as unknown as Record<string, unknown>,
          modifiedAt: new Date().toISOString(),
        })
      }
    }

    for (const entityId of previousItems.keys()) {
      if (!currentItems.has(entityId)) {
        changes.push({
          changeId: generateId('change'),
          entity,
          entityId,
          operation: 'delete',
          payload: { id: entityId },
          modifiedAt: new Date().toISOString(),
        })
      }
    }
  }

  return changes
}

function emptySnapshot(): SyncSnapshot {
  return {
    denrees: [],
    mouvements: [],
    menus: [],
    pointages: [],
    recettes: [],
    fournisseurs: [],
    commandes: [],
    classes: [],
  }
}

export const useSyncStore = defineStore('sync', () => {
  const imports = ref<ImportedSiteData[]>(loadFromStorage<ImportedSiteData[]>(STORAGE_IMPORTS, []))
  const conflits = ref<SyncConflict[]>(loadFromStorage<SyncConflict[]>(STORAGE_CONFLICTS, []))
  const lastExportAt = ref<string | null>(loadFromStorage<string | null>(STORAGE_LAST_EXPORT, null))
  const lastExportSnapshot = ref<SyncSnapshot | null>(loadFromStorage<SyncSnapshot | null>(STORAGE_EXPORT_SNAPSHOT, null))

  function persist() {
    saveToStorage(STORAGE_IMPORTS, imports.value)
    saveToStorage(STORAGE_CONFLICTS, conflits.value)
    saveToStorage(STORAGE_LAST_EXPORT, lastExportAt.value)
    saveToStorage(STORAGE_EXPORT_SNAPSHOT, lastExportSnapshot.value)
  }

  const site = computed<SyncSite>(() => {
    const classes = asArray<Classe>('classes', [])
    return {
      id: SITE_ID,
      nom: ECOLE_INFO.nom,
      commune: ECOLE_INFO.commune,
      region: ECOLE_INFO.region,
      totalInscrits: classes.reduce((sum, classe) => sum + classe.inscritsCantine, 0),
    }
  })

  function exporterDepuisDerniereSynchronisation(): SyncPackage {
    const snapshot = createSnapshot()
    const changes = diffSnapshots(lastExportSnapshot.value, snapshot)
    const createdAt = new Date().toISOString()
    const paquetSansChecksum = {
      version: 1 as const,
      packageId: generateId('sync'),
      sourceSite: site.value,
      createdAt,
      since: lastExportAt.value,
      snapshot,
      changes,
    }
    const paquet: SyncPackage = {
      ...paquetSansChecksum,
      checksum: checksum(paquetSansChecksum),
    }

    lastExportAt.value = createdAt
    lastExportSnapshot.value = snapshot
    persist()
    return paquet
  }

  function verifierPaquet(paquet: SyncPackage): boolean {
    if (paquet.version !== 1 || !paquet.packageId || !paquet.sourceSite?.id) return false
    const { checksum: providedChecksum, ...content } = paquet
    return checksum(content) === providedChecksum
  }

  function mergeImportedSnapshot(existing: SyncSnapshot, incoming: SyncSnapshot, paquet: SyncPackage) {
    const entities = Object.keys(incoming) as SyncEntity[]
    for (const entity of entities) {
      const currentItems = new Map(existing[entity].map((item, index) => [getEntityId(item as unknown as Record<string, unknown>, index), item]))
      for (const item of incoming[entity]) {
        const entityId = getEntityId(item as unknown as Record<string, unknown>, currentItems.size)
        const existingItem = currentItems.get(entityId)
        if (existingItem && JSON.stringify(existingItem) !== JSON.stringify(item)) {
          conflits.value.push({
            id: generateId('conflict'),
            packageId: paquet.packageId,
            sourceSiteId: paquet.sourceSite.id,
            entity,
            entityId,
            existing: existingItem as unknown as Record<string, unknown>,
            incoming: item as unknown as Record<string, unknown>,
            status: 'pending',
            detectedAt: new Date().toISOString(),
          })
        } else if (!existingItem) {
          const collection = existing[entity] as Array<Record<string, unknown>>
          collection.push(item as unknown as Record<string, unknown>)
        }
      }
    }
  }

  function importerPaquet(paquet: SyncPackage): { ok: boolean; error?: string; conflits: number } {
    if (!verifierPaquet(paquet)) return { ok: false, error: 'Paquet invalide ou checksum incorrect.', conflits: 0 }
    if (paquet.sourceSite.id === SITE_ID) return { ok: false, error: 'Un site ne peut pas importer son propre paquet.', conflits: 0 }
    if (imports.value.some((item) => item.lastPackageId === paquet.packageId)) {
      return { ok: false, error: 'Ce paquet a déjà été importé.', conflits: 0 }
    }

    const existing = imports.value.find((item) => item.site.id === paquet.sourceSite.id)
    const snapshot = existing ? structuredClone(existing.snapshot) : emptySnapshot()
    const conflitsAvant = conflits.value.length
    mergeImportedSnapshot(snapshot, paquet.snapshot, paquet)

    if (existing) {
      existing.snapshot = snapshot
      existing.lastPackageId = paquet.packageId
      existing.lastImportedAt = new Date().toISOString()
    } else {
      imports.value.push({
        site: paquet.sourceSite,
        snapshot,
        lastPackageId: paquet.packageId,
        lastImportedAt: new Date().toISOString(),
      })
    }

    persist()
    return { ok: true, conflits: conflits.value.length - conflitsAvant }
  }

  function resoudreConflit(id: string, decision: 'keep_existing' | 'accept_incoming') {
    const conflit = conflits.value.find((item) => item.id === id)
    if (!conflit || conflit.status !== 'pending') return false

    const imported = imports.value.find((item) => item.site.id === conflit.sourceSiteId)
    if (decision === 'accept_incoming' && imported) {
      const items = imported.snapshot[conflit.entity]
      const index = items.findIndex((item, itemIndex) => getEntityId(item as unknown as Record<string, unknown>, itemIndex) === conflit.entityId)
      if (index >= 0) items[index] = conflit.incoming as never
    }

    conflit.status = decision
    conflit.resolvedAt = new Date().toISOString()
    persist()
    return true
  }

  const conflitsEnAttente = computed(() => conflits.value.filter((conflit) => conflit.status === 'pending'))
  const sitesImportes = computed(() => imports.value.map((item) => item.site))

  return {
    site,
    imports,
    conflits,
    conflitsEnAttente,
    sitesImportes,
    lastExportAt,
    exporterDepuisDerniereSynchronisation,
    importerPaquet,
    resoudreConflit,
    verifierPaquet,
  }
})
