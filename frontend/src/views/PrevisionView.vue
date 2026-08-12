<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import { usePresenceStore } from '@/stores/presence'
import { useI18nStore } from '@/stores/i18n'
import { formatDate } from '@/utils/helpers'

const router = useRouter()
const auth = useAuthStore()
const stockStore = useStockStore()
const presenceStore = usePresenceStore()
const i18n = useI18nStore()

const isAdmin = computed(() => auth.currentUser?.role === 'admin')
const isGestionnaire = computed(() => auth.currentUser?.role === 'gestionnaire')

const attendancePredictionHistory = computed(() => {
  return presenceStore.getPresenceHistorySummary(null, 'day').slice(-28)
})

const attendancePredictionRows = computed(() => {
  const history = attendancePredictionHistory.value
  if (!history.length) return []

  const byWeekday = new Map<number, { sum: number; count: number }>()
  let historySum = 0

  for (const row of history) {
    const weekday = new Date(`${row.key}T00:00:00`).getDay()
    const stats = byWeekday.get(weekday) ?? { sum: 0, count: 0 }
    stats.sum += row.taux
    stats.count += 1
    byWeekday.set(weekday, stats)
    historySum += row.taux
  }

  const overallAverage = historySum / history.length
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() + index + 1)
    const dateIso = date.toISOString().split('T')[0]
    const weekdayStats = byWeekday.get(date.getDay())
    const predictedRate = Number(
      ((weekdayStats ? weekdayStats.sum / weekdayStats.count : overallAverage) || 0).toFixed(1),
    )
    const lowerRate = Math.max(0, predictedRate - 8)
    const upperRate = Math.min(100, predictedRate + 8)
    const predictedCount = Math.round((presenceStore.totalInscrits * predictedRate) / 100)
    const lowerCount = Math.round((presenceStore.totalInscrits * lowerRate) / 100)
    const upperCount = Math.round((presenceStore.totalInscrits * upperRate) / 100)

    return {
      key: dateIso,
      label: formatDate(dateIso),
      predictedRate,
      lowerRate,
      upperRate,
      predictedCount,
      lowerCount,
      upperCount,
    }
  })
})

const consumptionPredictionByDenree = computed(() => {
  const history = attendancePredictionHistory.value
  if (!history.length) return []

  const attendanceByDate = new Map(history.map((row) => [row.key, row.presents]))
  const relevantDates = new Set(history.map((row) => row.key))
  const denreeDailyQuantities = new Map<string, Map<string, number>>()

  for (const movement of stockStore.mouvements) {
    if (
      movement.type !== 'sortie' ||
      movement.motif !== 'preparation_repas' ||
      !relevantDates.has(movement.date)
    ) {
      continue
    }

    const dailyMap = denreeDailyQuantities.get(movement.date) ?? new Map<string, number>()
    dailyMap.set(movement.denreeId, (dailyMap.get(movement.denreeId) ?? 0) + movement.quantite)
    denreeDailyQuantities.set(movement.date, dailyMap)
  }

  const denreeStats = new Map<string, { denreeId: string; quantity: number; attendance: number; unite: string; nom: string }>()
  for (const [date, denreeMap] of denreeDailyQuantities.entries()) {
    const attendance = attendanceByDate.get(date) ?? 0
    for (const [denreeId, quantity] of denreeMap.entries()) {
      const denree = stockStore.getDenree(denreeId)
      const stats = denreeStats.get(denreeId) ?? {
        denreeId,
        quantity: 0,
        attendance: 0,
        unite: denree?.unite ?? 'unite',
        nom: denree?.nom ?? denreeId,
      }
      stats.quantity += quantity
      stats.attendance += attendance
      denreeStats.set(denreeId, stats)
    }
  }

  const totalForecastAttendance = attendancePredictionRows.value.reduce(
    (sum, row) => sum + row.predictedCount,
    0,
  )
  const totalLowerForecastAttendance = attendancePredictionRows.value.reduce(
    (sum, row) => sum + row.lowerCount,
    0,
  )
  const totalUpperForecastAttendance = attendancePredictionRows.value.reduce(
    (sum, row) => sum + row.upperCount,
    0,
  )

  return Array.from(denreeStats.values())
    .map((stats) => {
      const averagePerPerson = stats.attendance > 0 ? stats.quantity / stats.attendance : 0
      const predictedQuantity = Number((averagePerPerson * totalForecastAttendance).toFixed(1))
      const lowerQuantity = Number((averagePerPerson * totalLowerForecastAttendance).toFixed(1))
      const upperQuantity = Number((averagePerPerson * totalUpperForecastAttendance).toFixed(1))
      return {
        denreeId: stats.denreeId,
        denree: stats.nom,
        unite: stats.unite,
        predictedQuantity,
        lowerQuantity,
        upperQuantity,
      }
    })
    .filter((item) => item.predictedQuantity > 0)
    .sort((a, b) => b.predictedQuantity - a.predictedQuantity)
})

const attendancePredictionHistoryLabel = computed(() => {
  const count = attendancePredictionHistory.value.length
  return i18n.t('dashboard.prediction.historyLabel', { days: count })
})

function openCoursesAjustee() {
  router.push({ name: 'courses', query: { prediction: '1' } })
}
</script>

<template>
  <section class="page-card">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">{{ i18n.t('prevision.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500">{{ i18n.t('prevision.subtitle') }}</p>
        <p v-if="isGestionnaire" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {{ i18n.t('prevision.consumptionOnlyMessage') }}
        </p>
      </div>

      <button
        type="button"
        class="btn-primary h-12 w-full sm:w-auto"
        @click="openCoursesAjustee"
      >
        {{ i18n.t('prevision.openCoursesButton') }}
      </button>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div v-if="isAdmin" class="card">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">{{ i18n.t('dashboard.prediction.title') }}</h2>
          <span class="text-sm text-gray-500">{{ i18n.t('dashboard.prediction.subtitle') }}</span>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-50 p-4 shadow-sm">
            <p class="text-xs text-gray-500">{{ i18n.t('dashboard.prediction.next7Days') }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">
              {{ attendancePredictionRows.length ? attendancePredictionRows[0].predictedCount : '—' }}
            </p>
            <p class="mt-1 text-xs text-gray-500">{{ i18n.t('dashboard.prediction.estimatedAttendees') }}</p>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4 shadow-sm">
            <p class="text-xs text-gray-500">{{ attendancePredictionHistoryLabel }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ attendancePredictionRows.length ? attendancePredictionRows.length : 0 }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ i18n.t('dashboard.prediction.historyDays') }}</p>
          </div>
        </div>

        <div class="mt-6 overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-700">
            <thead class="text-xs uppercase text-gray-500">
              <tr>
                <th class="pb-2 pr-3">{{ i18n.t('dashboard.charts.dateLabel') }}</th>
                <th class="pb-2 pr-3">{{ i18n.t('dashboard.prediction.attendanceLabel') }}</th>
                <th class="pb-2">{{ i18n.t('dashboard.prediction.confidenceLabel') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in attendancePredictionRows" :key="row.key" class="border-t border-slate-200">
                <td class="py-2 pr-3">{{ row.label }}</td>
                <td class="py-2 pr-3 font-semibold text-slate-900">{{ row.predictedCount }} / {{ row.predictedRate }} %</td>
                <td class="py-2">{{ row.lowerRate }}–{{ row.upperRate }} %</td>
              </tr>
              <tr v-if="attendancePredictionRows.length === 0">
                <td colspan="3" class="py-4 text-center text-gray-500">{{ i18n.t('dashboard.prediction.noData') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-900">{{ i18n.t('dashboard.prediction.consumptionTitle') }}</h2>
                      <p class="text-sm text-gray-500">{{ i18n.t('dashboard.prediction.consumptionSub') }}</p>

          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-700">
            <thead class="text-xs uppercase text-gray-500">
              <tr>
                <th class="pb-2 pr-3">{{ i18n.t('dashboard.prediction.denreeLabel') }}</th>
                <th class="pb-2 pr-3">{{ i18n.t('dashboard.prediction.quantityLabel') }}</th>
                <th class="pb-2 pr-3">{{ i18n.t('prevision.confidenceInterval') }}</th>
                <th class="pb-2">{{ i18n.t('dashboard.prediction.unitLabel') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in consumptionPredictionByDenree" :key="item.denreeId" class="border-t border-slate-200">
                <td class="py-2 pr-3">{{ item.denree }}</td>
                <td class="py-2 pr-3 font-semibold text-slate-900">{{ item.predictedQuantity }}</td>
                <td class="py-2 pr-3 text-slate-600">{{ item.lowerQuantity }}–{{ item.upperQuantity }}</td>
                <td class="py-2">{{ item.unite }}</td>
              </tr>
              <tr v-if="consumptionPredictionByDenree.length === 0">
                <td colspan="4" class="py-4 text-center text-gray-500">{{ i18n.t('dashboard.prediction.noData') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
