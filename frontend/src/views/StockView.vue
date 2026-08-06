  <script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import PageHeader from '@/components/PageHeader.vue'
  import StockBadge from '@/components/StockBadge.vue'
  import { useAuthStore } from '@/stores/auth'
  import { useI18nStore } from '@/stores/i18n'
  import { useStockStore } from '@/stores/stock'
  import { CATEGORIE_LABELS, UNITE_LABELS } from '@/types'
  import { formatDate, formatNumber } from '@/utils/helpers'
  import { translateForUi } from '@/utils/foodTranslator'

  const router = useRouter()
  const auth = useAuthStore()
  const i18n = useI18nStore()
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

    router.push({ name: 'commandes', query: { fromStock: '1', lines: JSON.stringify(lignes) } })
  }
  </script>

  <template>
    <div>
      <PageHeader
        :title="i18n.t('stock.title')"
        :subtitle="i18n.t('stock.subtitle')"
      />

      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-3">
          <input v-model="search" class="input max-w-xs" :placeholder="i18n.t('stock.search')" />
          <select v-model="filterStatus" class="input max-w-[180px]">
            <option value="all">{{ i18n.t('stock.filterAll') }}</option>
            <option value="ok">{{ i18n.t('stock.filterOk') }}</option>
            <option value="warning">{{ i18n.t('stock.filterWarning') }}</option>
            <option value="critical">{{ i18n.t('stock.filterCritical') }}</option>
          </select>
        </div>
        <button
          v-if="auth.canAccess('commandes') && ['admin', 'gestionnaire'].includes(auth.currentUser?.role ?? '')"
          type="button"
          class="btn-primary"
          :disabled="!canCreateBon"
          @click="openCreateBonModal"
        >
          {{ i18n.t('stock.createOrder') }}
        </button>
      </div>
      <div v-if="auth.canAccess('commandes') && ['admin', 'gestionnaire'].includes(auth.currentUser?.role ?? '') && !canCreateBon" class="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {{ i18n.t('stock.noNeeds') }}
      </div>

      <div class="mb-4 flex gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-green-500" /> {{ i18n.t('stock.legendOk') }}</span>
        <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-amber-500" /> {{ i18n.t('stock.legendWarning') }}</span>
        <span class="flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-red-500" /> {{ i18n.t('stock.legendCritical') }}</span>
      </div>

      <div class="card overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr class="text-left text-xs text-gray-500">
              <th class="px-5 py-3">{{ i18n.t('stock.table.denree') }}</th>
              <th class="px-5 py-3">{{ i18n.t('stock.table.category') }}</th>
              <th class="px-5 py-3">{{ i18n.t('stock.table.currentStock') }}</th>
              <th class="px-5 py-3">{{ i18n.t('stock.table.alertThreshold') }}</th>
              <th class="px-5 py-3">{{ i18n.t('stock.table.expiration') }}</th>
              <th class="px-5 py-3">{{ i18n.t('stock.table.status') }}</th>
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
              <td class="px-5 py-3 font-medium">{{ translateForUi(d.nom) }}</td>
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
              <td colspan="6" class="px-5 py-6 text-center text-gray-500">{{ i18n.t('stock.noResults') }}</td>
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
              <h2 class="text-lg font-semibold">{{ i18n.t('stock.modal.title') }}</h2>
              <p class="text-sm text-gray-500">{{ i18n.t('stock.modal.subtitle') }}</p>
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
                  <p class="font-medium">{{ translateForUi(denree.nom) }}</p>
                  <p class="text-xs text-gray-500">{{ i18n.t('stock.modal.currentStock') }} : {{ formatNumber(denree.stockActuel) }} {{ UNITE_LABELS[denree.unite] }}</p>
                </div>
                <div class="w-32">
                  <label class="text-xs text-gray-600">{{ i18n.t('stock.modal.quantity') }}</label>
                  <input
                    v-model.number="commandeQuantites[denree.id]"
                    type="number"
                    min="0"
                    step="0.1"
                    class="input mt-1"
                    :placeholder="i18n.t('stock.modal.placeholder')"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <p v-if="creationError" class="text-sm text-red-700">{{ creationError }}</p>
            <div class="ml-auto flex gap-2">
              <button type="button" class="btn-secondary" @click="closeCreateBonModal">{{ i18n.t('general.cancel') }}</button>
              <button type="button" class="btn-primary" @click="createBonFromStock">{{ i18n.t('stock.modal.confirm') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
