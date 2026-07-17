<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StockBadge from '@/components/StockBadge.vue'
import { useStockStore } from '@/stores/stock'
import { CATEGORIE_LABELS, UNITE_LABELS } from '@/types'
import { formatDate, formatNumber } from '@/utils/helpers'

const stockStore = useStockStore()
const search = ref('')
const filterStatus = ref<'all' | 'ok' | 'warning' | 'critical'>('all')

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
</script>

<template>
  <div>
    <PageHeader
      title="Stock en temps réel"
      subtitle="Visualisation des quantités avec indicateurs vert / orange / rouge (US-04)"
    />

    <div class="mb-4 flex flex-wrap gap-3">
      <input v-model="search" class="input max-w-xs" placeholder="Rechercher une denrée…" />
      <select v-model="filterStatus" class="input max-w-[180px]">
        <option value="all">Tous les statuts</option>
        <option value="ok">OK (vert)</option>
        <option value="warning">Bas (orange)</option>
        <option value="critical">Critique (rouge)</option>
      </select>
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
        </tbody>
      </table>
    </div>
  </div>
</template>
