import type {
  BonCommande,
  Classe,
  Denree,
  Fournisseur,
  MenuHebdo,
  MouvementStock,
  PointagePresence,
  Recette,
} from '@/types'

export interface SyncSite {
  id: string
  nom: string
  commune: string
  region: string
  totalInscrits: number
}

export interface SyncSnapshot {
  denrees: Denree[]
  mouvements: MouvementStock[]
  menus: MenuHebdo[]
  pointages: PointagePresence[]
  recettes: Recette[]
  fournisseurs: Fournisseur[]
  commandes: BonCommande[]
  classes: Classe[]
}

export type SyncEntity = keyof SyncSnapshot
export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncChange {
  changeId: string
  entity: SyncEntity
  entityId: string
  operation: SyncOperation
  payload: Record<string, unknown>
  modifiedAt: string
}

export interface SyncPackage {
  version: 1
  packageId: string
  sourceSite: SyncSite
  createdAt: string
  since: string | null
  snapshot: SyncSnapshot
  changes: SyncChange[]
  checksum: string
}

export interface SyncConflict {
  id: string
  packageId: string
  sourceSiteId: string
  entity: SyncEntity
  entityId: string
  existing: Record<string, unknown>
  incoming: Record<string, unknown>
  status: 'pending' | 'keep_existing' | 'accept_incoming'
  detectedAt: string
  resolvedAt?: string
}

export interface ImportedSiteData {
  site: SyncSite
  snapshot: SyncSnapshot
  lastPackageId: string
  lastImportedAt: string
}
