import type {
  Classe,
  Denree,
  MenuHebdo,
  MouvementStock,
  PointagePresence,
  Recette,
  User,
  Fournisseur,
  BonCommande,
} from '@/types'
import { hashPassword } from '@/utils/helpers'

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function mondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

const today = new Date()

export const mockUsers: User[] = [
  {
    id: 'u1',
    username: 'directeur',
    password: hashPassword('directeur123'),
    nom: 'Rabe Andriamihaja',
    role: 'admin',
    actif: true,
  },
  {
    id: 'u2',
    username: 'stock',
    password: hashPassword('stock123'),
    nom: 'Rasoa Marie',
    role: 'gestionnaire',
    actif: true,
  },
  {
    id: 'u3',
    username: 'cuisine',
    password: hashPassword('cuisine123'),
    nom: 'Voahangy Razafy',
    role: 'planificateur',
    actif: true,
  },
  {
    id: 'u4',
    username: 'agent',
    password: hashPassword('agent123'),
    nom: 'Hery Rakoto',
    role: 'agent',
    actif: true,
  },
]

export const mockDenrees: Denree[] = [
  {
    id: 'd1',
    nom: 'Riz blanc',
    categorie: 'cereale',
    unite: 'kg',
    seuilAlerte: 50,
    dureeConservationJours: 180,
    stockActuel: 120,
    datePeremption: addDays(today, 90),
    actif: true,
  },
  {
    id: 'd2',
    nom: 'Haricots rouges',
    categorie: 'legumineuse',
    unite: 'kg',
    seuilAlerte: 20,
    dureeConservationJours: 365,
    stockActuel: 18,
    datePeremption: addDays(today, 200),
    actif: true,
  },
  {
    id: 'd3',
    nom: 'Huile de coco',
    categorie: 'huile',
    unite: 'litre',
    seuilAlerte: 10,
    dureeConservationJours: 365,
    stockActuel: 8,
    datePeremption: addDays(today, 5),
    actif: true,
  },
  {
    id: 'd4',
    nom: 'Laitue',
    categorie: 'legume',
    unite: 'kg',
    seuilAlerte: 5,
    dureeConservationJours: 7,
    stockActuel: 3,
    datePeremption: addDays(today, 4),
    actif: true,
  },
  {
    id: 'd5',
    nom: 'Poisson séché',
    categorie: 'proteine',
    unite: 'kg',
    seuilAlerte: 8,
    dureeConservationJours: 90,
    stockActuel: 12,
    datePeremption: addDays(today, 45),
    actif: true,
  },
  {
    id: 'd6',
    nom: 'Sel iodé',
    categorie: 'sel',
    unite: 'kg',
    seuilAlerte: 3,
    dureeConservationJours: 730,
    stockActuel: 5,
    actif: true,
  },
  {
    id: 'd7',
    nom: 'Patate douce',
    categorie: 'legume',
    unite: 'kg',
    seuilAlerte: 15,
    dureeConservationJours: 30,
    stockActuel: 25,
    datePeremption: addDays(today, 20),
    actif: true,
  },
  {
    id: 'd8',
    nom: 'Manioc',
    categorie: 'cereale',
    unite: 'kg',
    seuilAlerte: 20,
    dureeConservationJours: 14,
    stockActuel: 6,
    datePeremption: addDays(today, 6),
    actif: true,
  },
]

export const mockMouvements: MouvementStock[] = [
  {
    id: 'm1',
    denreeId: 'd1',
    type: 'entree',
    date: addDays(today, -5),
    quantite: 100,
    provenance: 'achat_local',
    prixAchat: 450000,
    numeroBon: 'BE-2026-042',
    userId: 'u2',
    createdAt: addDays(today, -5) + 'T08:30:00',
  },
  {
    id: 'm2',
    denreeId: 'd1',
    type: 'sortie',
    date: addDays(today, -2),
    quantite: 30,
    motif: 'preparation_repas',
    userId: 'u2',
    createdAt: addDays(today, -2) + 'T11:00:00',
  },
  {
    id: 'm3',
    denreeId: 'd3',
    type: 'entree',
    date: addDays(today, -10),
    quantite: 15,
    provenance: 'partenariat',
    numeroBon: 'BE-2026-038',
    userId: 'u2',
    createdAt: addDays(today, -10) + 'T09:00:00',
  },
]

export const mockRecettes: Recette[] = [
  {
    id: 'r1',
    nom: 'Riz au haricot',
    categorie: 'dejeuner',
    ingredients: [
      { denreeId: 'd1', quantiteParPortion: 0.15 },
      { denreeId: 'd2', quantiteParPortion: 0.05 },
      { denreeId: 'd6', quantiteParPortion: 0.002 },
      { denreeId: 'd3', quantiteParPortion: 0.01 },
    ],
    instructions:
      'Faire cuire le riz. Cuire les haricots séparément. Mélanger et assaisonner.',
    actif: true,
  },
  {
    id: 'r2',
    nom: 'Riz poisson',
    categorie: 'dejeuner',
    ingredients: [
      { denreeId: 'd1', quantiteParPortion: 0.15 },
      { denreeId: 'd5', quantiteParPortion: 0.04 },
      { denreeId: 'd6', quantiteParPortion: 0.002 },
    ],
    instructions: 'Cuire le riz. Réhydrater le poisson séché et servir.',
    actif: true,
  },
  {
    id: 'r3',
    nom: 'Patate douce bouillie',
    categorie: 'complement',
    ingredients: [
      { denreeId: 'd7', quantiteParPortion: 0.2 },
      { denreeId: 'd6', quantiteParPortion: 0.001 },
    ],
    instructions: 'Éplucher et faire bouillir les patates douces.',
    actif: true,
  },
  {
    id: 'r4',
    nom: 'Riz manioc',
    categorie: 'dejeuner',
    ingredients: [
      { denreeId: 'd1', quantiteParPortion: 0.1 },
      { denreeId: 'd8', quantiteParPortion: 0.1 },
      { denreeId: 'd4', quantiteParPortion: 0.03 },
    ],
    instructions: 'Cuire le riz et le manioc. Servir avec salade de laitue.',
    actif: true,
  },
]

export const mockMenu: MenuHebdo = {
  id: 'menu1',
  semaineDebut: mondayOfWeek(today),
  jours: [
    { jour: 0, recetteId: 'r1', portionsPrevues: 180 },
    { jour: 1, recetteId: 'r2', portionsPrevues: 180 },
    { jour: 2, recetteId: 'r4', portionsPrevues: 180 },
    { jour: 3, recetteId: 'r1', portionsPrevues: 180 },
    { jour: 4, recetteId: 'r3', portionsPrevues: 180 },
  ],
  valide: false,
}

export const mockClasses: Classe[] = [
  { id: 'c1', nom: 'CP1', niveau: 'CP', inscritsCantine: 35 },
  { id: 'c2', nom: 'CP2', niveau: 'CP', inscritsCantine: 32 },
  { id: 'c3', nom: 'CE1', niveau: 'CE', inscritsCantine: 38 },
  { id: 'c4', nom: 'CE2', niveau: 'CE', inscritsCantine: 36 },
  { id: 'c5', nom: 'CM1', niveau: 'CM', inscritsCantine: 40 },
  { id: 'c6', nom: 'CM2', niveau: 'CM', inscritsCantine: 39 },
]

export const mockPointages: PointagePresence[] = [
  {
    id: 'p1',
    date: addDays(today, -1),
    classeId: null,
    presents: 172,
    inscrits: 220,
    exemptions: 5,
    userId: 'u4',
    createdAt: addDays(today, -1) + 'T10:30:00',
  },
]

export const mockFournisseurs: Fournisseur[] = [
  {
    id: 'f1',
    nom: 'Coopérative Ambovombe',
    contact: 'Rabe +261 34 12 345 67',
    localisation: 'Ambovombe',
    produits: ['d1', 'd2', 'd6'],
    actif: true,
  },
  {
    id: 'f2',
    nom: 'Maraîchers Sud',
    contact: 'Soa +261 33 98 765 43',
    localisation: 'Tôlagnaro',
    produits: ['d4', 'd7', 'd8'],
    actif: true,
  },
]

export const mockBonCommandes: BonCommande[] = []

export const ECOLE_INFO = {
  nom: 'EPP Ambovombe Centre',
  commune: 'Ambovombe-Androy',
  region: 'Androy',
  totalInscrits: 220,
}
