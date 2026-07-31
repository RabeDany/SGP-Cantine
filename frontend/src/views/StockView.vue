<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StockBadge from '@/components/StockBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { CATEGORIE_LABELS, UNITE_LABELS, type Denree } from '@/types'
import { formatDate, formatNumber } from '@/utils/helpers'

const router = useRouter()
const auth = useAuthStore()
const stockStore = useStockStore()
const search = ref('')
const filterStatus = ref<'all' | 'ok' | 'warning' | 'critical'>('all')
const showCreateBonModal = ref(false)
const commandeQuantites = ref<Record<string, number>>({})
const creationError = ref('')

const filtered = computed(() => {
  let list = stockStore.denreesAvecStatut
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((d) => d.nom.toLowerCase().includes(q))
  }
  if (filterStatus.value !== 'all') {
    list = list.filter((d) => d.status === filterStatus.value)
  }
  return list
})

const canCreateBon = computed(() =>
  filtered.value.some((denree) => Math.max(0, denree.seuilAlerte - denree.stockActuel) > 0),
)

function openCreateBonModal() {
  creationError.value = ''
  commandeQuantites.value = {}
  filtered.value.forEach((denree) => {
    commandeQuantites.value[denree.id] = Math.max(0, denree.seuilAlerte - denree.stockActuel)
  })
  showCreateBonModal.value = true
}

function closeCreateBonModal() {
  showCreateBonModal.value = false
  commandeQuantites.value = {}
  creationError.value = ''
}

function createBonFromStock() {
  const lignes = Object.entries(commandeQuantites.value)
    .filter(([, quantite]) => quantite > 0)
    .map(([denreeId, quantite]) => ({ denreeId, quantite }))

  if (!lignes.length) {
    creationError.value = 'Saisissez au moins une quantité à commander.'
    return
  }

  const query = new URLSearchParams({
    fromStock: '1',
    lines: JSON.stringify(lignes),
  })

  router.push({ name: 'commandes', query: { fromStock: '1', lines: JSON.stringify(lignes) } })
}

function getDenreeName(denreeId: string) {
  return stockStore.getDenree(denreeId)?.nom ?? denreeId
}
</script>

<template>
  <div>
    <PageHeader
      title="Stock en temps réel"
      subtitle="Visualisation des quantités avec indicateurs vert / orange / rouge (US-04)"
    />

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <input v-model="search" class="input max-w-xs" placeholder="Rechercher une denrée…" />
        <select v-model="filterStatus" class="input max-w-[180px]">
          <option value="all">Tous les statuts</option>
          <option value="ok">OK (vert)</option>
          <option value="warning">Bas (orange)</option>
          <option value="critical">Critique (rouge)</option>
        </select>
      </div>
      <button
        v-if="auth.canAccess('commandes') && ['admin', 'gestionnaire'].includes(auth.currentUser?.role ?? '')"
        type="button"
        class="btn-primary"
        :disabled="!canCreateBon"
        @click="openCreateBonModal"
      >
        Créer bon depuis les besoins en stock
      </button>
    </div>
    <div v-if="auth.canAccess('commandes') && ['admin', 'gestionnaire'].includes(auth.currentUser?.role ?? '') && !canCreateBon" class="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
      Aucun besoin de commande n’est détecté pour les denrées sélectionnées.
    </div>

    <div class="mb-4 flex gap-4 text-xs text-gray-500">
      <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-green-500" /> OK — au-dessus du seuil</span>
      <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-amber-500" /> Bas — ≤ seuil</span>
      <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-red-500" /> Critique — ≤ 50 % du seuil</span>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Denrée</th>
            <th class="px-5 py-3">Catégorie</th>
            <th class="px-5 py-3">Stock actuel</th>
            <th class="px-5 py-3">Seuil alerte</th>
            <th class="px-5 py-3">Péremption</th>
            <th class="px-5 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in filtered"
            :key="d.id"
            class="border-t border-gray-100"
            :class="{
              'bg-red-50/50': d.status === 'critical',
              'bg-amber-50/30': d.status === 'warning',
            }"
          >
            <td class="px-5 py-3 font-medium">{{ d.nom }}</td>
            <td class="px-5 py-3 text-gray-600">{{ CATEGORIE_LABELS[d.categorie] }}</td>
            <td class="px-5 py-3">
              <span class="font-semibold">{{ formatNumber(d.stockActuel) }}</span>
              {{ UNITE_LABELS[d.unite] }}
            </td>
            <td class="px-5 py-3 text-gray-500">
              {{ formatNumber(d.seuilAlerte) }} {{ UNITE_LABELS[d.unite] }}
            </td>
            <td class="px-5 py-3">
              <template v-if="d.datePeremption">
                <span
                  :class="
                    d.joursAvantPeremption !== null && d.joursAvantPeremption <= 7
                      ? 'font-medium text-amber-700'
                      : 'text-gray-600'
                  "
                >
                  {{ formatDate(d.datePeremption) }}
                  <span v-if="d.joursAvantPeremption !== null" class="text-xs">
                    ({{ d.joursAvantPeremption }} j.)
                  </span>
                </span>
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-5 py-3"><StockBadge :status="d.status" /></td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="px-5 py-6 text-center text-gray-500">Aucune denrée ne correspond aux filtres.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showCreateBonModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Créer un bon depuis les besoins en stock</h2>
            <p class="text-sm text-gray-500">Saisissez les quantités à commander pour chaque denrée.</p>
          </div>
          <button type="button" class="text-gray-500 hover:text-gray-900" @click="closeCreateBonModal">✕</button>
        </div>

        <div class="max-h-[60vh] space-y-3 overflow-y-auto">
          <div
            v-for="denree in filtered"
            :key="denree.id"
            class="rounded-lg border border-gray-200 p-4"
          >
            <div class="mb-2 flex items-center justify-between gap-3">
              <div>
                <p class="font-medium">{{ denree.nom }}</p>
                <p class="text-xs text-gray-500">Stock actuel : {{ formatNumber(denree.stockActuel) }} {{ UNITE_LABELS[denree.unite] }}</p>
              </div>
              <div class="w-32">
                <label class="text-xs text-gray-600">Quantité</label>
                <input
                  v-model.number="commandeQuantites[denree.id]"
                  type="number"
                  min="0"
                  step="0.1"
                  class="input mt-1"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <p v-if="creationError" class="text-sm text-red-700">{{ creationError }}</p>
          <div class="ml-auto flex gap-2">
            <button type="button" class="btn-secondary" @click="closeCreateBonModal">Annuler</button>
            <button type="button" class="btn-primary" @click="createBonFromStock">Valider</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
