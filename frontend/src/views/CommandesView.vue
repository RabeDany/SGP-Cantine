<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useCommandeStore } from '@/stores/commande'
import { useStockStore } from '@/stores/stock'
import { UNITE_LABELS } from '@/types'
import { todayISO } from '@/utils/helpers'

const auth = useAuthStore()
const commandeStore = useCommandeStore()
const stockStore = useStockStore()

const fournisseurId = ref('')
const dateCommande = ref(todayISO())
const dateLivraisonSouhaitee = ref(todayISO())
const quantites = ref<Record<string, number>>({})

const fournisseursActifs = computed(() => commandeStore.fournisseurs.filter((f) => f.actif))
const denreesActives = computed(() => stockStore.denrees.filter((d) => d.actif))
const bons = computed(() => commandeStore.bonsCommande)

function submitBonCommande() {
  if (!fournisseurId.value || !dateCommande.value || !dateLivraisonSouhaitee.value) return
  const lignes = Object.entries(quantites.value)
    .filter(([, qte]) => qte > 0)
    .map(([denreeId, qte]) => ({ denreeId, quantite: qte }))
  if (!lignes.length) return
  commandeStore.createBonCommande({
    fournisseurId: fournisseurId.value,
    emetteurId: auth.currentUser?.id ?? 'unknown',
    dateCommande: dateCommande.value,
    dateLivraisonSouhaitee: dateLivraisonSouhaitee.value,
    lignes,
  })
  quantites.value = {}
}

function formatStatut(statut: string) {
  return statut === 'emitted' ? 'Émis' : statut === 'validated' ? 'Validé' : 'Reçu'
}

function getFournisseurName(id: string) {
  return commandeStore.getFournisseur(id)?.nom ?? id
}
</script>

<template>
  <div>
    <PageHeader
      title="Bons de commande"
      subtitle="Créer un bon de commande à partir de la liste de courses et suivre son statut."
    />

    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">Fournisseur</label>
        <select v-model="fournisseurId" class="input">
          <option value="">— Sélectionner —</option>
          <option v-for="f in fournisseursActifs" :key="f.id" :value="f.id">
            {{ f.nom }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">Date commande</label>
        <input v-model="dateCommande" type="date" class="input" />
      </div>
      <div>
        <label class="label">Date livraison souhaitée</label>
        <input v-model="dateLivraisonSouhaitee" type="date" class="input" />
      </div>
    </div>

    <div class="card mb-6">
      <p class="label">Lignes de commande</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="d in denreesActives"
          :key="d.id"
          class="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div class="mb-2 font-medium">{{ d.nom }}</div>
          <div class="text-gray-500 text-sm">{{ d.categorie }} · {{ UNITE_LABELS[d.unite] }}</div>
          <input
            type="number"
            min="0"
            step="0.1"
            class="input mt-3"
            v-model.number="quantites[d.id]"
            placeholder="Quantité"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="submitBonCommande">
          Enregistrer le bon de commande
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Réf</th>
            <th class="px-5 py-3">Fournisseur</th>
            <th class="px-5 py-3">Date</th>
            <th class="px-5 py-3">Livraison</th>
            <th class="px-5 py-3">Lignes</th>
            <th class="px-5 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bon in bons" :key="bon.id" class="border-t border-gray-100">
            <td class="px-5 py-3 font-medium">{{ bon.id }}</td>
            <td class="px-5 py-3">{{ getFournisseurName(bon.fournisseurId) }}</td>
            <td class="px-5 py-3">{{ bon.dateCommande }}</td>
            <td class="px-5 py-3">{{ bon.dateLivraisonSouhaitee }}</td>
            <td class="px-5 py-3 text-gray-600">{{ bon.lignes.length }} ligne(s)</td>
            <td class="px-5 py-3">{{ formatStatut(bon.statut) }}</td>
          </tr>
          <tr v-if="!bons.length">
            <td colspan="6" class="px-5 py-6 text-center text-gray-500">Aucun bon de commande enregistré.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
