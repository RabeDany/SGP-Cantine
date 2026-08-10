<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import {
  buildAttendanceReportData,
  buildConsumptionReportData,
  buildMenuReportData,
  buildStockReportData,
  formatDate,
  formatNumber,
  toCsv,
} from '@/utils/helpers'
import { translateForUi } from '@/utils/foodTranslator'

const stockStore = useStockStore()
const presenceStore = usePresenceStore()
const menuStore = useMenuStore()
const i18n = useI18nStore()

const currentMonth = computed(() => new Date().toISOString().slice(0, 7))
const periodOptions = computed(() => {
  const months = new Set([
    ...stockStore.mouvements.map((movement) => movement.date.slice(0, 7)),
    ...presenceStore.pointages.map((pointage) => pointage.date.slice(0, 7)),
  ])
  return Array.from(months).sort().reverse()
})
const selectedPeriod = ref(currentMonth.value)
const selectedDenree = ref('all')

const stockReport = computed(() =>
  buildStockReportData(
    stockStore.denrees.map((denree) => ({
      id: denree.id,
      nom: denree.nom,
      unite: denree.unite,
      stockActuel: denree.stockActuel,
      seuilAlerte: denree.seuilAlerte,
      categorie: denree.categorie,
      actif: denree.actif,
      dureeConservationJours: denree.dureeConservationJours,
    })),
    stockStore.mouvements,
    currentMonth.value,
  ),
)

const attendanceReport = computed(() =>
  buildAttendanceReportData(
    presenceStore.pointages
      .filter((pointage) => pointage.date.startsWith(currentMonth.value))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date)),
    presenceStore.totalInscrits,
  ),
)

const menuReport = computed(() =>
  buildMenuReportData(
    menuStore.menuActuel,
    menuStore.recettes,
    Object.fromEntries(
      stockStore.denrees.map((denree) => [denree.id, { nom: denree.nom, unite: denree.unite }]),
    ),
    menuStore.menuActuel.jours.reduce((sum, jour) => sum + (jour.portionsPrevues ?? 0), 0),
  ),
)

const consumptionReport = computed(() =>
  buildConsumptionReportData(
    stockStore.denrees,
    stockStore.mouvements.filter((movement) => movement.date.startsWith(selectedPeriod.value)),
    presenceStore.pointages.filter((pointage) => pointage.date.startsWith(selectedPeriod.value)),
    selectedPeriod.value,
  ),
)

const consumptionRows = computed(() => {
  if (selectedDenree.value === 'all') return consumptionReport.value.items
  return consumptionReport.value.items.filter((entry) => entry.denreeId === selectedDenree.value)
})

const denreeOptions = computed(() => [
  { value: 'all', label: i18n.t('rapports.consumption.allDenrees') },
  ...stockStore.denrees.map((denree) => ({ value: denree.id, label: denree.nom })),
])

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportStockCsv() {
  const rows = stockReport.value.lowStockItems.map((item) => ({
    denree: item.nom,
    stock: item.stockActuel,
    seuil: item.seuilAlerte,
    unite: item.unite,
  }))
  downloadFile(`stock-${currentMonth.value}.csv`, toCsv(rows), 'text/csv;charset=utf-8;')
}

function exportStockJson() {
  downloadFile(
    `stock-${currentMonth.value}.json`,
    JSON.stringify(stockReport.value, null, 2),
    'application/json;charset=utf-8;',
  )
}

function exportAttendanceCsv() {
  const rows = attendanceReport.value.dailyRows.map((row) => ({
    date: row.date,
    presents: row.presents,
    inscrits: row.inscrits,
    taux: row.rate,
  }))
  downloadFile(`presence-${currentMonth.value}.csv`, toCsv(rows), 'text/csv;charset=utf-8;')
}

function exportConsumptionCsv() {
  const rows = consumptionRows.value.map((row) => ({
    denree: row.denree,
    quantite: row.quantity,
    unite: row.unite,
    repas_servis: consumptionReport.value.totalMealsServed,
    ratio_qte_par_repas: row.ratio,
  }))
  downloadFile(`consommation-${selectedPeriod.value}.csv`, toCsv(rows), 'text/csv;charset=utf-8;')
}

function exportGlobalJson() {
  downloadFile(
    `sgp-cantine-export-${currentMonth.value}.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stock: stockReport.value,
        attendance: attendanceReport.value,
        menu: menuReport.value,
      },
      null,
      2,
    ),
    'application/json;charset=utf-8;',
  )
}

function printCurrentSection() {
  const section = document.getElementById('menu-print-section')
  if (!section) {
    window.print()
    return
  }

  const previousTitle = document.title
  document.title = 'Fiche de menu hebdomadaire - SGP-Cantine'

  const printContents = section.innerHTML
  const originalContents = document.body.innerHTML

  document.body.innerHTML = `
    <div style="padding: 24px; font-family: Arial, sans-serif; color: #111827;">
      ${printContents}
    </div>
  `

  window.print()
  document.body.innerHTML = originalContents
  document.title = previousTitle
  window.location.reload()
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('rapports.title')"
      :subtitle="i18n.t('rapports.subtitle')"
    />

    <div class="mb-6 flex flex-wrap gap-3">
      <button type="button" class="btn-secondary" @click="exportStockCsv">{{ i18n.t('rapports.export.stockCsv') }}</button>
      <button type="button" class="btn-secondary" @click="exportStockJson">{{ i18n.t('rapports.export.stockJson') }}</button>
      <button type="button" class="btn-secondary" @click="exportAttendanceCsv">{{ i18n.t('rapports.export.attendanceCsv') }}</button>
      <button type="button" class="btn-secondary" @click="exportConsumptionCsv">{{ i18n.t('rapports.export.consumptionCsv') }}</button>
      <button type="button" class="btn-primary" @click="exportGlobalJson">{{ i18n.t('rapports.export.globalJson') }}</button>
      <button type="button" class="btn-primary" @click="printCurrentSection">{{ i18n.t('rapports.export.print') }}</button>
    </div>

    <section class="card mb-6 print-card">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('rapports.consumption.title', { period: selectedPeriod }) }}</h2>
          <p class="text-sm text-gray-500">{{ i18n.t('rapports.consumption.subtitle') }}</p>
        </div>
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">US-25</span>
      </div>

      <div class="mb-4 grid gap-4 md:grid-cols-3">
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.consumption.mealsServed') }}</p>
          <p class="text-2xl font-semibold">{{ consumptionReport.totalMealsServed }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.consumption.totalConsumed') }}</p>
          <p class="text-2xl font-semibold">{{ formatNumber(consumptionReport.totalConsumed, 1) }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.consumption.ratio') }}</p>
          <p class="text-2xl font-semibold text-emerald-700">
            {{ consumptionRows.length ? formatNumber(consumptionRows.reduce((sum, row) => sum + row.ratio, 0) / consumptionRows.length, 3) : 0 }}
          </p>
        </div>
      </div>

      <div class="mb-4 grid gap-4 md:grid-cols-2">
        <div>
          <label class="label">{{ i18n.t('rapports.consumption.filter.period') }}</label>
          <select v-model="selectedPeriod" class="input">
            <option v-for="period in periodOptions" :key="period" :value="period">{{ period }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ i18n.t('rapports.consumption.filter.denree') }}</label>
          <select v-model="selectedDenree" class="input">
            <option v-for="option in denreeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-3 py-2">{{ i18n.t('rapports.consumption.table.denree') }}</th>
              <th class="px-3 py-2">{{ i18n.t('rapports.consumption.table.quantity') }}</th>
              <th class="px-3 py-2">{{ i18n.t('rapports.consumption.table.meals') }}</th>
              <th class="px-3 py-2">{{ i18n.t('rapports.consumption.table.ratio') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in consumptionRows" :key="row.denreeId" class="border-t border-gray-100">
              <td class="px-3 py-2 font-medium text-gray-900">{{ translateForUi(row.denree) }}</td>
              <td class="px-3 py-2">{{ formatNumber(row.quantity, 2) }} {{ row.unite }}</td>
              <td class="px-3 py-2">{{ consumptionReport.totalMealsServed }}</td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-3">
                  <div class="h-2.5 w-28 overflow-hidden rounded-full bg-gray-100">
                    <div class="h-full rounded-full bg-emerald-500" :style="{ width: `${Math.min(100, row.ratio * 100)}%` }"></div>
                  </div>
                  <span>{{ formatNumber(row.ratio, 3) }} {{ i18n.t('rapports.consumption.unitPerMeal') }}</span>
                </div>
              </td>
            </tr>
            <tr v-if="consumptionRows.length === 0">
              <td colspan="4" class="px-3 py-6 text-center text-gray-500">{{ i18n.t('rapports.consumption.noResults') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="card print-card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('rapports.stock.title', { period: stockReport.period }) }}</h2>
            <p class="text-sm text-gray-500">{{ i18n.t('rapports.stock.subtitle') }}</p>
          </div>
          <span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">US-16</span>
        </div>

        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.stock.items') }}</p>
            <p class="text-xl font-semibold">{{ stockReport.totalItems }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.stock.movements') }}</p>
            <p class="text-xl font-semibold">{{ stockReport.movementsCount }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.stock.lowItems') }}</p>
            <p class="text-xl font-semibold text-amber-700">{{ stockReport.lowStockItems.length }}</p>
          </div>
        </div>

        <div class="mb-4">
          <div class="mb-2 text-sm font-semibold text-gray-700">{{ i18n.t('rapports.stock.summary') }}</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="item in stockReport.summary" :key="item.label" class="rounded-full bg-earth-50 px-3 py-1 text-sm text-gray-700">
              {{ item.label }} : {{ item.value }}
            </span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th class="px-3 py-2">{{ i18n.t('rapports.stock.table.denree') }}</th>
                <th class="px-3 py-2">{{ i18n.t('rapports.stock.table.stock') }}</th>
                <th class="px-3 py-2">{{ i18n.t('rapports.stock.table.threshold') }}</th>
                <th class="px-3 py-2">{{ i18n.t('rapports.stock.table.state') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in stockReport.lowStockItems" :key="item.id" class="border-t border-gray-100">
                <td class="px-3 py-2 font-medium text-gray-900">{{ translateForUi(item.nom) }}</td>
                <td class="px-3 py-2">{{ formatNumber(item.stockActuel, 0) }} {{ item.unite }}</td>
                <td class="px-3 py-2">{{ formatNumber(item.seuilAlerte, 0) }} {{ item.unite }}</td>
                <td class="px-3 py-2">
                  <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">{{ i18n.t('rapports.stock.watch') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card print-card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('rapports.attendance.title', { month: currentMonth }) }}</h2>
            <p class="text-sm text-gray-500">{{ i18n.t('rapports.attendance.subtitle') }}</p>
          </div>
          <span class="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">US-17</span>
        </div>

        <div class="mb-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.attendance.mealsServed') }}</p>
            <p class="text-xl font-semibold">{{ attendanceReport.totalMealsServed }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.attendance.averageRate') }}</p>
            <p class="text-xl font-semibold">{{ attendanceReport.averageAttendanceRate }} %</p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-500">{{ i18n.t('rapports.attendance.absenteeism') }}</p>
            <p class="text-xl font-semibold text-amber-700">{{ attendanceReport.absentRate }} %</p>
          </div>
        </div>

        <div class="space-y-2">
          <div v-for="row in attendanceReport.dailyRows" :key="row.date" class="rounded-lg border border-gray-100 p-3">
            <div class="mb-2 flex items-center justify-between text-sm">
              <span class="font-medium text-gray-900">{{ formatDate(row.date) }}</span>
              <span class="text-gray-500">{{ i18n.t('rapports.attendance.presentCount', { present: row.presents, inscrits: row.inscrits }) }}</span>
            </div>
            <div class="h-2 rounded-full bg-gray-100">
              <div class="h-2 rounded-full bg-brand-600" :style="{ width: `${Math.max(8, row.rate)}%` }"></div>
            </div>
            <p class="mt-2 text-xs text-gray-500">{{ i18n.t('rapports.attendance.presenceRate', { rate: row.rate }) }}</p>
          </div>
        </div>
      </section>
    </div>

    <section id="menu-print-section" class="mt-6 card print-card">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('rapports.menu.title', { date: formatDate(menuReport.week) }) }}</h2>
          <p class="text-sm text-gray-500">{{ i18n.t('rapports.menu.subtitle') }}</p>
        </div>
        <span class="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">US-18</span>
      </div>

      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.menu.portions') }}</p>
          <p class="text-xl font-semibold">{{ menuReport.totalPortions }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.menu.days') }}</p>
          <p class="text-xl font-semibold">{{ menuReport.mealsByDay.length }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">{{ i18n.t('rapports.menu.ingredients') }}</p>
          <p class="text-xl font-semibold">{{ menuReport.ingredients.length }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 class="mb-2 text-sm font-semibold text-gray-700">{{ i18n.t('rapports.menu.planning') }}</h3>
          <ul class="space-y-2">
            <li v-for="meal in menuReport.mealsByDay" :key="meal.day" class="rounded-lg border border-gray-100 p-3 text-sm">
              <div class="font-medium text-gray-900">{{ meal.day }}</div>
              <div class="text-gray-600">{{ translateForUi(meal.recette) }}</div>
              <div class="text-gray-500">{{ i18n.t('rapports.menu.mealPortions', { count: meal.portions }) }}</div>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-2 text-sm font-semibold text-gray-700">{{ i18n.t('rapports.menu.needs') }}</h3>
          <ul class="space-y-2">
            <li v-for="ingredient in menuReport.ingredients" :key="ingredient.denree" class="rounded-lg border border-gray-100 p-3 text-sm">
              <div class="font-medium text-gray-900">{{ translateForUi(ingredient.denree) }}</div>
              <div class="text-gray-600">{{ formatNumber(ingredient.quantite, 2) }} {{ ingredient.unite }}</div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: white;
  }

  .print-card {
    break-inside: avoid;
    box-shadow: none !important;
    border: 1px solid #e5e7eb;
  }

  .btn-secondary,
  .btn-primary,
  .page-header {
    display: none !important;
  }

  .print-card {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
}
</style>
