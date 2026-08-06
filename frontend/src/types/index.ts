export type UserRole = 'admin' | 'gestionnaire' | 'planificateur' | 'agent'

export type DenreeCategorie =
  | 'cereale'
  | 'legume'
  | 'legumineuse'
  | 'huile'
  | 'sel'
  | 'proteine'

export type UniteMesure = 'kg' | 'litre' | 'unite'

export type ProvenanceStock = 'achat_local' | 'don' | 'partenariat'

export type MotifSortie = 'preparation_repas' | 'perte' | 'avarie' | 'transfert'

export type RecetteCategorie = 'dejeuner' | 'complement'

export interface User {
  id: string
  username: string
  password: string
  nom: string
  role: UserRole
  actif: boolean
}

export interface Denree {
  id: string
  nom: string
  categorie: DenreeCategorie
  unite: UniteMesure
  seuilAlerte: number
  dureeConservationJours: number
  stockActuel: number
  datePeremption?: string
  actif: boolean
}

export interface MouvementStock {
  id: string
  denreeId: string
  type: 'entree' | 'sortie'
  date: string
  quantite: number
  provenance?: ProvenanceStock
  prixAchat?: number
  numeroBon?: string
  motif?: MotifSortie
  commentaire?: string
  menuId?: string
  userId: string
  createdAt: string
}

export interface IngredientRecette {
  denreeId: string
  quantiteParPortion: number
}

export interface Recette {
  id: string
  nom: string
  categorie: RecetteCategorie
  ingredients: IngredientRecette[]
  instructions: string
  actif: boolean
}

export interface MenuJour {
  jour: number
  recetteId: string | null
  portionsPrevues: number
}

export interface MenuHebdo {
  id: string
  semaineDebut: string
  jours: MenuJour[]
  valide: boolean
  dateValidation?: string
  validationParId?: string
  validationMouvements?: Array<{
    denreeId: string
    quantite: number
    userId: string
    commentaire?: string
  }>
}

export interface Fournisseur {
  id: string
  nom: string
  contact: string
  localisation: string
  produits: string[]
  actif: boolean
}

export type StatutBonCommande = 'emitted' | 'validated' | 'received' | 'partially_received'

export interface LigneBonCommande {
  denreeId: string
  quantite: number
}

export interface LigneReceptionBonCommande {
  denreeId: string
  quantiteCommandee: number
  quantiteRecue: number
  ecart: number
  commentaire?: string
}

export interface BonCommande {
  id: string
  fournisseurId: string
  emetteurId: string
  dateCommande: string
  dateLivraisonSouhaitee: string
  lignes: LigneBonCommande[]
  statut: StatutBonCommande
  valideurId?: string
  dateValidation?: string
  receptionParId?: string
  quantiteRecue?: number
  ecart?: number
  receptionLignes?: LigneReceptionBonCommande[]
  dateReception?: string
}

export interface Classe {
  id: string
  nom: string
  niveau: string
  inscritsCantine: number
}

export interface PointagePresence {
  id: string
  date: string
  classeId: string | null
  presents: number
  inscrits: number
  exemptions: number
  userId: string
  createdAt: string
}

export interface BesoinDenree {
  denreeId: string
  quantiteNecessaire: number
  stockDisponible: number
  manquant: number
}

export interface SortiePreparationLigne {
  jour: number
  jourLabel: string
  recetteId: string
  recetteNom: string
  denreeId: string
  quantite: number
  portions: number
}

export type StockStatus = 'ok' | 'warning' | 'critical'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  gestionnaire: 'Gestionnaire stock',
  planificateur: 'Planificateur menu',
  agent: 'Agent cantine',
}

export const CATEGORIE_LABELS: Record<DenreeCategorie, string> = {
  cereale: 'Céréale',
  legume: 'Légume',
  legumineuse: 'Légumineuse',
  huile: 'Huile',
  sel: 'Sel',
  proteine: 'Protéine',
}

export const UNITE_LABELS: Record<UniteMesure, string> = {
  kg: 'kg',
  litre: 'L',
  unite: 'unité',
}

export const JOURS_SEMAINE = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
] as const

export const PROVENANCE_LABELS: Record<ProvenanceStock, string> = {
  achat_local: 'Achat local',
  don: 'Don',
  partenariat: 'Partenariat producteur',
}

export const MOTIF_LABELS: Record<MotifSortie, string> = {
  preparation_repas: 'Préparation repas',
  perte: 'Perte',
  avarie: 'Avarie',
  transfert: 'Transfert autre école',
}
