<script setup lang="ts">
import { computed } from 'vue'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import { translateForUi } from '@/utils/foodTranslator'

const stockStore = useStockStore()
const i18n = useI18nStore()

const denreesActives = computed(() => stockStore.denreesAvecStatut.filter((d) => d.actif))
const totalCritiques = computed(() => denreesActives.value.filter((d) => d.status === 'critical').length)
const totalWarnings = computed(() => denreesActives.value.filter((d) => d.status === 'warning').length)
const totalOk = computed(() => denreesActives.value.filter((d) => d.status === 'ok').length)

function exportCsv() {
  const headers = [
    i18n.t('inventaire.column.nom'),
    i18n.t('inventaire.column.stock'),
    i18n.t('inventaire.column.status'),
    i18n.t('inventaire.column.peremption'),
  ]
  const rows = denreesActives.value.map((denree) => [
    denree.nom,
    denree.stockActuel.toString(),
    denree.status,
    denree.joursAvantPeremption !== null ? denree.joursAvantPeremption.toString() : '—',
  ])
  const csv = [headers, ...rows].map((line) => line.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'inventaire.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-earth-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">{{ i18n.t('inventaire.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ i18n.t('inventaire.subtitle') }}</p>
        </div>
        <button type="button" class="btn-secondary" @click="exportCsv">
          {{ i18n.t('inventaire.exportCsv') }}
        </button>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl bg-emerald-50 p-4">
          <p class="text-sm text-emerald-700">{{ i18n.t('stock.metrics.ok') }}</p>
          <p class="mt-2 text-3xl font-semibold text-emerald-900">{{ totalOk }}</p>
        </div>
        <div class="rounded-2xl bg-amber-50 p-4">
          <p class="text-sm text-amber-700">{{ i18n.t('stock.metrics.warning') }}</p>
          <p class="mt-2 text-3xl font-semibold text-amber-900">{{ totalWarnings }}</p>
        </div>
        <div class="rounded-2xl bg-red-50 p-4">
          <p class="text-sm text-red-700">{{ i18n.t('stock.metrics.critical') }}</p>
          <p class="mt-2 text-3xl font-semibold text-red-900">{{ totalCritiques }}</p>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-earth-200 bg-white p-6 shadow-sm">
      <div class="overflow-hidden rounded-3xl border border-earth-200">
        <table class="min-w-full divide-y divide-earth-200 text-left text-sm">
          <thead class="bg-earth-50 text-gray-700">
            <tr>
              <th class="px-6 py-4 font-semibold">{{ i18n.t('inventaire.column.nom') }}</th>
              <th class="px-6 py-4 font-semibold">{{ i18n.t('inventaire.column.stock') }}</th>
              <th class="px-6 py-4 font-semibold">{{ i18n.t('inventaire.column.status') }}</th>
              <th class="px-6 py-4 font-semibold">{{ i18n.t('inventaire.column.peremption') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-earth-200 bg-white">
            <tr v-if="denreesActives.length === 0">
              <td class="px-6 py-8 text-center text-sm text-gray-500" colspan="4">
                {{ i18n.t('inventaire.noItems') }}
              </td>
            </tr>
            <tr v-for="denree in denreesActives" :key="denree.id">
              <td class="px-6 py-4 text-gray-900">{{ translateForUi(denree.nom) }}</td>
              <td class="px-6 py-4 text-gray-900">{{ denree.stockActuel }}</td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  :class="{
                    'bg-emerald-100 text-emerald-800': denree.status === 'ok',
                    'bg-amber-100 text-amber-800': denree.status === 'warning',
                    'bg-red-100 text-red-800': denree.status === 'critical',
                  }"
                >
                  {{ i18n.t(`stock.status.${denree.status}`) }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-900">
                {{ denree.joursAvantPeremption !== null ? denree.joursAvantPeremption : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-6 flex justify-end">
        <button type="button" class="btn-primary">
          {{ i18n.t('inventaire.validate') }}
        </button>
      </div>
    </div>
  </div>
</template>
