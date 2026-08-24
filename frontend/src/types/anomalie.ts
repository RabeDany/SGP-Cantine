export type AnomalieNiveau = 1 | 2 | 3

export type AnomalieStatut = 'en_cours' | 'justifiee' | 'non_justifiee'

export type AnomalieType =
  | 'ecart_inventaire'
  | 'consommation_anormale'
  | 'pointage_excessif'
  | 'sortie_hors_horaire'

export type OperationBloqueeKind = 'pointage_global' | 'pointage_classe' | 'sortie_stock'

export interface OperationBloquee {
  kind: OperationBloqueeKind
  payload: Record<string, unknown>
  executed?: boolean
}

export interface Anomalie {
  id: string
  type: AnomalieType
  niveau: AnomalieNiveau
  statut: AnomalieStatut
  titre: string
  description: string
  denreeId?: string
  dateDetection: string
  utilisateurId?: string
  justification?: string
  valideurId?: string
  valideurNom?: string
  dateValidation?: string
  cleOperation?: string
  operationBloquee?: OperationBloquee
  detail?: Record<string, unknown>
}

export const ANOMALIE_NIVEAU_LABELS: Record<AnomalieNiveau, string> = {
  1: 'Niveau 1 — Information',
  2: 'Niveau 2 — Avertissement',
  3: 'Niveau 3 — Bloquant',
}

export const ANOMALIE_STATUT_LABELS: Record<AnomalieStatut, string> = {
  en_cours: 'En cours d’investigation',
  justifiee: 'Justifiée',
  non_justifiee: 'Non justifiée',
}

export const ANOMALIE_TYPE_LABELS: Record<AnomalieType, string> = {
  ecart_inventaire: 'Écart d’inventaire',
  consommation_anormale: 'Consommation anormale',
  pointage_excessif: 'Pointage excessif',
  sortie_hors_horaire: 'Sortie hors horaires',
}