import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockBonCommandes, mockFournisseurs } from '@/data/mockData'
import { generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import type { BonCommande, Fournisseur, LigneReceptionBonCommande } from '@/types'

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
    produits: string[]
  }) {
    const id = generateId('f')
    fournisseurs.value.push({
      id,
      nom: data.nom,
      contact: data.contact,
      produits: data.produits,
      actif: true,
    })
    persist()
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
  }) {
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
    return id
  }

  function validateBonCommande(id: string, valideurId: string) {
    const bon = bonsCommande.value.find((b) => b.id === id)
    if (!bon || bon.statut !== 'emitted' || bon.emetteurId === valideurId || bon.valideurId) {
      return false
    }
    bon.statut = 'validated'
    bon.valideurId = valideurId
    bon.dateValidation = new Date().toISOString()
    persist()
    return true
  }

  function receiveBonCommande(id: string, receptionLignes: LigneReceptionBonCommande[], userId: string) {
    const bon = bonsCommande.value.find((b) => b.id === id)
    if (!bon || bon.statut !== 'validated' || !receptionLignes.length) {
      return false
    }
    const totalRecue = receptionLignes.reduce((sum, ligne) => sum + ligne.quantiteRecue, 0)
    const totalCommandee = receptionLignes.reduce((sum, ligne) => sum + ligne.quantiteCommandee, 0)
    bon.statut = 'received'
    bon.quantiteRecue = totalRecue
    bon.ecart = totalRecue - totalCommandee
    bon.dateReception = todayISO()
    bon.receptionParId = userId
    bon.receptionLignes = receptionLignes
    persist()
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
