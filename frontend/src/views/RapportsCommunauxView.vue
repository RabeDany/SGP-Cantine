<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useCommunalStore } from '@/stores/communal'
import { useI18nStore } from '@/stores/i18n'
import { formatNumber } from '@/utils/helpers'

const communalStore = useCommunalStore()
const i18n = useI18nStore()

const selectedDenree = ref<string>('all')
const selectedEcole = ref<string>('all')
const selectedPeriode = ref<string>('all')

const denreeOptions = computed(() => [
  { value: 'all', label: i18n.t('communal.filter.allDenrees') },
  ...communalStore.denrees.map((d) => ({ value: d.id, label: d.nom })),
])

const ecoleOptions = computed(() => [
  { value: 'all', label: i18n.t('communal.filter.allEcoles') },
  ...communalStore.ecoles.map((e) => ({ value: e.id, label: e.nom })),
])

const periodeOptions = computed(() => [
  { value: 'all', label: i18n.t('communal.filter.allPeriodes') },
  ...communalStore.periodesDisponibles.map((p) => ({ value: p, label: p })),
])

const consommationsFiltrees = computed(() =>
  communalStore.getConsommationFiltree(
    selectedDenree.value === 'all' ? null : selectedDenree.value,
    selectedEcole.value === 'all' ? null : selectedEcole.value,
    selectedPeriode.value === 'all' ? null : selectedPeriode.value,
  ),
)

const regions = computed(() => Object.keys(communalStore.rupturesParRegion))

function getEcoleNom(id: string) {
  return communalStore.getEcole(id)?.nom ?? id
}

function getDenreeNom(id: string) {
  return communalStore.getDenree(id)?.nom ?? id
}

function printRapport() {
  window.print()
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('communal.title')"
      :subtitle="i18n.t('communal.subtitle')"
    />

    <!-- Bandeau lecture seule -->
    <div class="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3">
      <span class="text-2xl">🔒</span>
      <p class="text-sm text-blue-900">{{ i18n.t('communal.readOnly') }}</p>
    </div>

    <!-- Statistiques globales -->
    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('communal.stats.ecoles') }}</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ communalStore.statsCommunales.totalEcoles }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('communal.stats.ruptures') }}</p>
        <p class="mt-2 text-3xl font-semibold text-amber-700">{{ communalStore.statsCommunales.totalRuptures }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('communal.stats.consommation') }}</p>
        <p class="mt-2 text-3xl font-semibold text-emerald-700">{{ formatNumber(communalStore.statsCommunales.totalConsommation, 0) }} kg</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('communal.stats.repas') }}</p>
        <p class="mt-2 text-3xl font-semibold text-blue-700">{{ formatNumber(communalStore.statsCommunales.totalRepas, 0) }}</p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">{{ i18n.t('communal.filter.denree') }}</label>
        <select v-model="selectedDenree" class="input">
          <option v-for="option in denreeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('communal.filter.ecole') }}</label>
        <select v-model="selectedEcole" class="input">
          <option v-for="option in ecoleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('communal.filter.periode') }}</label>
        <select v-model="selectedPeriode" class="input">
          <option v-for="option in periodeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
    </div>

    <!-- Ruptures de stock par région -->
    <section class="card mb-6">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('communal.ruptures.title') }}</h2>
          <p class="text-sm text-gray-500">{{ i18n.t('communal.ruptures.subtitle') }}</p>
        </div>
        <span class="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">US-29</span>
      </div>

      <div v-if="regions.length === 0" class="py-8 text-center text-sm text-gray-500">
        {{ i18n.t('communal.ruptures.empty') }}
      </div>

      <div v-for="region in regions" :key="region" class="mb-6 last:mb-0">
        <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          <span class="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          {{ region }}
          <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            {{ communalStore.rupturesParRegion[region].length }}
          </span>
        </h3>
        <div class="overflow-x-auto rounded-xl border border-gray-100">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-4 py-2.5">{{ i18n.t('communal.ruptures.ecole') }}</th>
                <th class="px-4 py-2.5">{{ i18n.t('communal.ruptures.denree') }}</th>
                <th class="px-4 py-2.5">{{ i18n.t('communal.ruptures.stock') }}</th>
                <th class="px-4 py-2.5">{{ i18n.t('communal.ruptures.seuil') }}</th>
                <th class="px-4 py-2.5">{{ i18n.t('communal.ruptures.manque') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in communalStore.rupturesParRegion[region]" :key="index" class="border-t border-gray-100">
                <td class="px-4 py-2.5 font-medium text-gray-900">{{ item.ecole.nom }}</td>
                <td class="px-4 py-2.5">{{ item.denree.nom }}</td>
                <td class="px-4 py-2.5 font-semibold text-red-700">{{ item.stock }} {{ item.denree.unite }}</td>
                <td class="px-4 py-2.5 text-gray-600">{{ item.denree.seuilAlerte }} {{ item.denree.unite }}</td>
                <td class="px-4 py-2.5">
                  <span class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                    -{{ item.manque }} {{ item.denree.unite }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Écoles les plus consommatrices -->
    <section class="card mb-6">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('communal.conso.title') }}</h2>
        <p class="text-sm text-gray-500">{{ i18n.t('communal.conso.subtitle') }}</p>
      </div>
      <div class="space-y-3">
        <div
          v-for="(item, index) in communalStore.ecolesPlusConsommatrices"
          :key="item.ecole.id"
          class="flex items-center gap-4 rounded-xl border border-gray-100 p-4"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
            {{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-gray-900">{{ item.ecole.nom }}</p>
            <p class="text-xs text-gray-500">{{ item.ecole.region }} · {{ item.ecole.commune }}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-semibold text-gray-900">{{ formatNumber(item.quantite, 0) }} kg</p>
            <p class="text-xs text-gray-500">{{ formatNumber(item.repasServis, 0) }} {{ i18n.t('communal.conso.repas') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Détail des consommations -->
    <section class="card">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('communal.detail.title') }}</h2>
          <p class="text-sm text-gray-500">{{ i18n.t('communal.detail.subtitle') }}</p>
        </div>
        <button type="button" class="btn-secondary" @click="printRapport">{{ i18n.t('communal.export') }}</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2.5">{{ i18n.t('communal.detail.ecole') }}</th>
              <th class="px-4 py-2.5">{{ i18n.t('communal.detail.denree') }}</th>
              <th class="px-4 py-2.5">{{ i18n.t('communal.detail.quantite') }}</th>
              <th class="px-4 py-2.5">{{ i18n.t('communal.detail.repas') }}</th>
              <th class="px-4 py-2.5">{{ i18n.t('communal.detail.periode') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(conso, index) in consommationsFiltrees" :key="index" class="border-t border-gray-100">
              <td class="px-4 py-2.5 font-medium text-gray-900">{{ getEcoleNom(conso.ecoleId) }}</td>
              <td class="px-4 py-2.5">{{ getDenreeNom(conso.denreeId) }}</td>
              <td class="px-4 py-2.5">{{ formatNumber(conso.quantite, 1) }} {{ conso.unite }}</td>
              <td class="px-4 py-2.5">{{ formatNumber(conso.repasServis, 0) }}</td>
              <td class="px-4 py-2.5 text-gray-600">{{ conso.periode }}</td>
            </tr>
            <tr v-if="consommationsFiltrees.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-gray-500">{{ i18n.t('communal.detail.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
@media print {
  .btn-secondary {
    display: none !important;
  }
}
</style>
