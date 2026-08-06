import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockBonCommandes, mockFournisseurs } from '@/data/mockData'
import { generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import { useAuditStore } from '@/stores/audit'
import type { AuditActionType, BonCommande, Fournisseur, LigneReceptionBonCommande, UserRole } from '@/types'

export const useCommandeStore = defineStore('commande', () => {
  const fournisseurs = ref<Fournisseur[]>(loadFromStorage('fournisseurs', [...mockFournisseurs]))
  const bonsCommande = ref<BonCommande[]>(loadFromStorage('bonsCommande', [...mockBonCommandes]))

  function persist() {
    saveToStorage('fournisseurs', fournisseurs.value)
    saveToStorage('bonsCommande', bonsCommande.value)
  }

  function getFournisseur(id: string) {
    return fournisseurs.value.find((f) => f.id === id) ?? null
  }

  function createFournisseur(data: {
    nom: string
    contact: string
    localisation: string
    produits: string[]
  }, user?: { id: string; nom: string; role: UserRole }) {
    const id = generateId('f')
    fournisseurs.value.push({
      id,
      nom: data.nom,
      contact: data.contact,
      localisation: data.localisation,
      produits: data.produits,
      actif: true,
    })
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'supplier_create',
        actionLabel: 'Création fournisseur',
        description: `Fournisseur ${data.nom} créé par ${user.nom}`,
        module: 'commande',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: id,
        targetType: 'supplier',
      })
    }
    return id
  }

  function updateFournisseur(id: string, data: Partial<Fournisseur>) {
    const idx = fournisseurs.value.findIndex((f) => f.id === id)
    if (idx >= 0) {
      fournisseurs.value[idx] = { ...fournisseurs.value[idx], ...data }
      persist()
    }
  }

  function createBonCommande(data: {
    fournisseurId: string
    emetteurId: string
    dateCommande: string
    dateLivraisonSouhaitee: string
    lignes: { denreeId: string; quantite: number }[]
  }, user?: { id: string; nom: string; role: UserRole }) {
    const id = generateId('bc')
    const bon: BonCommande = {
      id,
      fournisseurId: data.fournisseurId,
      emetteurId: data.emetteurId,
      dateCommande: data.dateCommande,
      dateLivraisonSouhaitee: data.dateLivraisonSouhaitee,
      lignes: data.lignes,
      statut: 'emitted',
    }
    bonsCommande.value.unshift(bon)
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'order_create',
        actionLabel: 'Création bon de commande',
        description: `Bon ${id} créé par ${user.nom}`,
        module: 'commande',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: id,
        targetType: 'order',
      })
    }
    return id
  }

  function validateBonCommande(id: string, valideurId: string, user?: { id: string; nom: string; role: UserRole }) {
    const bon = bonsCommande.value.find((b) => b.id === id)
    if (!bon || bon.statut !== 'emitted' || bon.emetteurId === valideurId || bon.valideurId) {
      return false
    }
    bon.statut = 'validated'
    bon.valideurId = valideurId
    bon.dateValidation = new Date().toISOString()
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'order_validate',
        actionLabel: 'Validation bon de commande',
        description: `Bon ${id} validé par ${user.nom}`,
        module: 'commande',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: id,
        targetType: 'order',
      })
    }
    return true
  }

  function receiveBonCommande(id: string, receptionLignes: LigneReceptionBonCommande[], userId: string, user?: { id: string; nom: string; role: UserRole }) {
    const bon = bonsCommande.value.find((b) => b.id === id)
    if (!bon || bon.statut !== 'validated' || !receptionLignes.length) {
      return false
    }

    const totalRecue = receptionLignes.reduce((sum, ligne) => sum + ligne.quantiteRecue, 0)
    const totalCommandee = receptionLignes.reduce((sum, ligne) => sum + ligne.quantiteCommandee, 0)
    const ecart = totalCommandee - totalRecue

    bon.statut = totalRecue >= totalCommandee ? 'received' : 'partially_received'
    bon.quantiteRecue = totalRecue
    bon.ecart = ecart
    bon.dateReception = todayISO()
    bon.receptionParId = userId
    bon.receptionLignes = receptionLignes
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'order_receive',
        actionLabel: 'Réception bon de commande',
        description: `Bon ${id} réceptionné par ${user.nom}`,
        module: 'commande',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: id,
        targetType: 'order',
      })
    }
    return true
  }

  return {
    fournisseurs,
    bonsCommande,
    getFournisseur,
    createFournisseur,
    updateFournisseur,
    createBonCommande,
    validateBonCommande,
    receiveBonCommande,
  }
})
