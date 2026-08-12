<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import Icon from '@/components/Icon.vue'
import StatCard from '@/components/StatCard.vue'
import StockBadge from '@/components/StockBadge.vue'
import { useStockStore } from '@/stores/stock'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'

import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { CATEGORIE_LABELS, UNITE_LABELS } from '@/types'
import { formatDate, formatNumber } from '@/utils/helpers'
import { translateForUi } from '@/utils/foodTranslator'

const stockStore = useStockStore()
const menuStore = useMenuStore()
const presenceStore = usePresenceStore()
const auth = useAuthStore()
const i18n = useI18nStore()

const stats = computed(() => stockStore.statsStock)

const alertesPeremption = computed(() => stockStore.alertesPeremption)
const denreesCritiques = computed(() =>
  stockStore.denreesAvecStatut.filter((d) => d.status !== 'ok').slice(0, 5),
)
const manquants = computed(() => menuStore.denreesManquantes.slice(0, 5))

const rupturesActives = computed(() => stockStore.rupturesActives)
const tauxGaspillage = computed(() => stockStore.tauxGaspillage)

const averageCostPerMeal = computed(() => {
  const prixParDenree = stockStore.prixUnitaireMoyen
  let totalCout = 0
  let totalRepas = 0

  for (const jour of menuStore.menuActuel.jours) {
    if (!jour.recetteId) continue
    const recette = menuStore.getRecette(jour.recetteId)
    if (!recette) continue

    const menuStart = new Date(`${menuStore.menuActuel.semaineDebut}T00:00:00`)
    const date = new Date(menuStart)
    date.setDate(date.getDate() + jour.jour)
    const dateIso = date.toISOString().split('T')[0]

    const portions = presenceStore.isPointageEffectuePourDate(dateIso)
      ? presenceStore.totalPresentsPourDate(dateIso)
      : jour.portionsPrevues

    totalRepas += portions
    for (const ingredient of recette.ingredients) {
      const prixUnitaire = prixParDenree[ingredient.denreeId] ?? 0
      totalCout += prixUnitaire * ingredient.quantiteParPortion * portions
    }
  }

  return totalRepas > 0 ? totalCout / totalRepas : 0
})

const nutritionDistribution = computed(() => {
  const categories = new Map<string, number>()
  const previousCategories = new Map<string, number>()

  const getPortionsForJour = (menu: typeof menuStore.menuActuel, jour: typeof menuStore.menuActuel.jours[0]) => {
    const menuStart = new Date(`${menu.semaineDebut}T00:00:00`)
    const date = new Date(menuStart)
    date.setDate(date.getDate() + jour.jour)
    const dateIso = date.toISOString().split('T')[0]
    return presenceStore.isPointageEffectuePourDate(dateIso)
      ? presenceStore.totalPresentsPourDate(dateIso)
      : jour.portionsPrevues
  }

  const accumulate = (menu: typeof menuStore.menuActuel | null, target: Map<string, number>) => {
    if (!menu) return
    for (const jour of menu.jours) {
      if (!jour.recetteId) continue
      const recette = menuStore.getRecette(jour.recetteId)
      if (!recette) continue
      const portions = getPortionsForJour(menu, jour)
      target.set(recette.categorie, (target.get(recette.categorie) ?? 0) + portions)
    }
  }

  const previousMenu = menuStore.menusDisponibles.find((menu) => menu.id !== menuStore.menuActuel.id) ?? null
  accumulate(menuStore.menuActuel, categories)
  accumulate(previousMenu, previousCategories)

  const currentEntries = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])
  const previousEntries = Array.from(previousCategories.entries()).sort((a, b) => b[1] - a[1])

  return {
    current: currentEntries.map(([categorie, portions]) => ({ categorie, portions })),
    previous: previousEntries.map(([categorie, portions]) => ({ categorie, portions })),
  }
})

const nutritionLabel = computed(() => {
  const current = nutritionDistribution.value.current
  if (!current.length) return i18n.t('dashboard.nutrition.noData')
  const total = current.reduce((sum, item) => sum + item.portions, 0)
  return current
    .map((entry) => `${CATEGORIE_LABELS[entry.categorie as keyof typeof CATEGORIE_LABELS] ?? entry.categorie} ${formatNumber(
      total > 0 ? (entry.portions / total) * 100 : 0,
      0,
    )}%`)
    .join(' / ')
})

const nutritionSegments = computed(() => {
  const segments = nutritionDistribution.value.current
  const total = segments.reduce((sum, item) => sum + item.portions, 0)
  const colors = ['#2563EB', '#16A34A', '#F59E0B', '#DB2777', '#8B5CF6', '#14B8A6']
  let startAngle = 0

  const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    }
  }

  const describeArc = (cx: number, cy: number, radius: number, startAngleVal: number, endAngleVal: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngleVal)
    const end = polarToCartesian(cx, cy, radius, startAngleVal)
    const largeArcFlag = endAngleVal - startAngleVal <= 180 ? '0' : '1'
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy}`
  }

  return segments.map((entry, index) => {
    const ratio = total > 0 ? entry.portions / total : 0
    const endAngle = startAngle + ratio * 360
    const path = describeArc(100, 100, 80, startAngle, endAngle)
    const segment = {
      ...entry,
      ratio,
      color: colors[index % colors.length],
      path,
      label: `${CATEGORIE_LABELS[entry.categorie as keyof typeof CATEGORIE_LABELS] ?? entry.categorie} ${formatNumber(
        total > 0 ? ratio * 100 : 0,
        0,
      )}%`,
    }
    startAngle = endAngle
    return segment
  })
})

const attendanceTrendRows = computed(() => {
  return presenceStore.getPresenceHistorySummary(null, 'day').slice(-7)
})

const consumptionTrendSeries = computed(() => {
  return attendanceTrendRows.value.map((row) => {
    const total = stockStore.mouvements
      .filter(
        (movement) =>
          movement.type === 'sortie' &&
          movement.motif === 'preparation_repas' &&
          movement.date === row.key,
      )
      .reduce((sum, movement) => sum + movement.quantite, 0)
    return { date: row.key, value: total }
  })
})

const trendChartBounds = computed(() => {
  const maxAttendance = attendanceTrendRows.value.length
    ? Math.max(...attendanceTrendRows.value.map((row) => row.taux), 100)
    : 100
  const maxConsumption = consumptionTrendSeries.value.length
    ? Math.max(...consumptionTrendSeries.value.map((row) => row.value), 10)
    : 10
  return { maxAttendance, maxConsumption }
})

const attendanceTrendPath = computed(() => {
  if (!attendanceTrendRows.value.length) return ''
  const widthStep = 520 / Math.max(attendanceTrendRows.value.length - 1, 1)
  return attendanceTrendRows.value
    .map((row, index) => {
      const x = 20 + index * widthStep
      const y = 90 - (row.taux / trendChartBounds.value.maxAttendance) * 70
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
})

const consumptionTrendPath = computed(() => {
  if (!consumptionTrendSeries.value.length) return ''
  const widthStep = 520 / Math.max(consumptionTrendSeries.value.length - 1, 1)
  return consumptionTrendSeries.value
    .map((point, index) => {
      const x = 20 + index * widthStep
      const y = 90 - (point.value / trendChartBounds.value.maxConsumption) * 70
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
})

const attendanceTrendPoints = computed(() => {
  if (!attendanceTrendRows.value.length) return []
  const widthStep = 520 / Math.max(attendanceTrendRows.value.length - 1, 1)
  return attendanceTrendRows.value.map((row, index) => {
    const x = 20 + index * widthStep
    const y = 90 - (row.taux / trendChartBounds.value.maxAttendance) * 70
    return { x, y, value: row.taux, label: row.label }
  })
})

const consumptionTrendPoints = computed(() => {
  if (!consumptionTrendSeries.value.length) return []
  const widthStep = 520 / Math.max(consumptionTrendSeries.value.length - 1, 1)
  return consumptionTrendSeries.value.map((point, index) => {
    const x = 20 + index * widthStep
    const y = 90 - (point.value / trendChartBounds.value.maxConsumption) * 70
    return { x, y, value: point.value }
  })
})

const attendanceTrendLabels = computed(() => attendanceTrendRows.value.map((row) => row.label))

function printDashboard() {
  const section = document.getElementById('dashboard-print-section')
  if (!section) {
    window.print()
    return
  }

  const previousTitle = document.title
  document.title = 'Tableau de bord SGP-Cantine'
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
      :title="i18n.t('dashboard.title')"
      :subtitle="i18n.t('dashboard.subtitle', { user: auth.currentUser?.nom ?? '' })"
    />

    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <p class="text-sm text-gray-500">{{ i18n.t('dashboard.export.subtitle') }}</p>
      </div>
      <button type="button" class="btn-secondary" @click="printDashboard">
        {{ i18n.t('dashboard.export.pdf') }}
      </button>
    </div>

    <div id="dashboard-print-section">
    <!-- Alertes péremption US-05 -->
    <div
      v-if="alertesPeremption.length && auth.hasRole('admin', 'gestionnaire', 'planificateur')"
      class="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4"
    >
      <div class="flex items-start gap-3">
        <Icon name="warning" className="text-xl text-amber-900" />
        <div>
          <h3 class="font-semibold text-amber-900">
            {{ alertesPeremption.length }} {{ i18n.t('dashboard.alertPeremption') }}
          </h3>
          <ul class="mt-2 space-y-1 text-sm text-amber-800">
            <li v-for="d in alertesPeremption" :key="d.id">
              <strong>{{ translateForUi(d.nom) }}</strong> — {{ i18n.t('dashboard.stock.expiration') }}
              {{ d.datePeremption ? formatDate(d.datePeremption) : i18n.t('general.notAvailable') }}
              ({{ d.joursAvantPeremption }} {{ i18n.t('general.daysAbbreviation') }})
              · Stock : {{ formatNumber(d.stockActuel) }} {{ UNITE_LABELS[d.unite] }}
            </li>
          </ul>
          <p class="mt-2 text-xs text-amber-700">
            {{ i18n.t('dashboard.alertAdvice') }}
          </p>
        </div>
      </div>
    </div>

    <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard :label="i18n.t('dashboard.cards.denrees')" :value="stats.total" icon="box" color="blue" />
      <StatCard :label="i18n.t('dashboard.cards.ok')" :value="stats.ok" icon="check-circle" color="green" />
      <StatCard :label="i18n.t('dashboard.cards.low')" :value="stats.warning + stats.critical" icon="warning" color="amber" />
      <StatCard
        :label="i18n.t('dashboard.cards.presences')"
        :value="presenceStore.pointageEffectue ? presenceStore.totalPresentsAujourdhui : '—'"
        icon="user"
        color="gray"
      />
    </div>

    <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        :label="i18n.t('dashboard.cards.avgCost')"
        :value="`${formatNumber(averageCostPerMeal, 0)} Ar`"
        icon="receipt"
        color="blue"
      />
      <StatCard
        :label="i18n.t('dashboard.cards.waste')"
        :value="`${formatNumber(tauxGaspillage, 1)} %`"
        icon="chart-line"
        color="red"
      />
      <StatCard
        :label="i18n.t('dashboard.cards.nutrition')"
        :value="nutritionLabel"
        icon="leaf"
        color="green"
      />
      <StatCard
        :label="i18n.t('dashboard.cards.ruptures')"
        :value="rupturesActives"
        icon="store"
        color="amber"
      />
    </div>

    <div class="mb-8 grid gap-6 lg:grid-cols-2">
      <section class="card">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ i18n.t('dashboard.charts.nutritionTitle') }}</h3>
          <span class="text-sm text-gray-500">{{ i18n.t('dashboard.charts.nutritionSub') }}</span>
        </div>
        <div class="flex flex-col items-center gap-6 lg:flex-row">
          <svg viewBox="0 0 200 200" class="h-56 w-full max-w-[280px]">
            <circle cx="100" cy="100" r="80" fill="#f8fafc" />
            <template v-for="segment in nutritionSegments" :key="segment.categorie">
              <path :d="segment.path" :fill="segment.color" />
            </template>
            <circle cx="100" cy="100" r="45" fill="white" />
            <text x="100" y="102" fill="#334155" text-anchor="middle" font-size="12">{{ i18n.t('dashboard.charts.nutritionCenter') }}</text>
          </svg>
          <div class="w-full space-y-2 text-sm text-gray-700">
            <div v-for="segment in nutritionSegments" :key="segment.categorie" class="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span class="h-3.5 w-3.5 rounded-full" :style="{ backgroundColor: segment.color }" />
              <span>{{ segment.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ i18n.t('dashboard.charts.trendTitle') }}</h3>
          <span class="text-sm text-gray-500">{{ i18n.t('dashboard.charts.trendSub') }}</span>
        </div>
        <div class="rounded-3xl bg-slate-50 p-4">
          <svg viewBox="0 0 560 110" class="h-72 w-full">
            <path d="M20 10 H540" stroke="#E2E8F0" stroke-width="1" />
            <path d="M20 40 H540" stroke="#E2E8F0" stroke-width="1" />
            <path d="M20 70 H540" stroke="#E2E8F0" stroke-width="1" />
            <path d="M20 100 H540" stroke="#E2E8F0" stroke-width="1" />
            <path v-if="attendanceTrendPath" :d="attendanceTrendPath" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" />
            <path v-if="consumptionTrendPath" :d="consumptionTrendPath" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" opacity="0.9" />
            <template v-for="point in attendanceTrendPoints" :key="`att-${point.label}`">
              <circle :cx="point.x" :cy="point.y" r="3" fill="#2563EB" />
            </template>
            <template v-for="(point, index) in consumptionTrendPoints" :key="`conso-${index}`">
              <circle :cx="point.x" :cy="point.y" r="3" fill="#16A34A" />
            </template>
          </svg>
          <div class="mt-3 grid grid-cols-7 gap-1 text-[11px] text-gray-500">
            <span v-for="label in attendanceTrendLabels" :key="label" class="text-center">{{ label }}</span>
          </div>
          <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span class="inline-flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-blue-600" />{{ i18n.t('dashboard.charts.attendanceLabel') }}
            </span>
            <span class="inline-flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-600" />{{ i18n.t('dashboard.charts.consumptionLabel') }}
            </span>
          </div>
          <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm">
            <div class="mb-2 text-sm font-semibold text-slate-900">{{ i18n.t('dashboard.charts.dataTitle') }}</div>
            <div class="grid grid-cols-3 gap-2 font-medium text-slate-500">
              <div>{{ i18n.t('dashboard.charts.dateLabel') }}</div>
              <div>{{ i18n.t('dashboard.charts.attendanceLabel') }}</div>
              <div>{{ i18n.t('dashboard.charts.consumptionLabel') }}</div>
            </div>
            <div class="mt-2 space-y-2 text-sm">
              <div
                v-for="(row, index) in attendanceTrendRows"
                :key="row.key"
                class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span>{{ row.label }}</span>
                <span>{{ row.taux }} %</span>
                <span>{{ consumptionTrendSeries[index]?.value ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card">
        <h3 class="mb-4 font-semibold text-gray-900">{{ i18n.t('dashboard.stock.title') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-xs text-gray-500">
                <th class="pb-2 pr-4">{{ i18n.t('dashboard.stock.table.denree') }}</th>
                <th class="pb-2 pr-4">{{ i18n.t('dashboard.stock.table.category') }}</th>
                <th class="pb-2 pr-4">{{ i18n.t('dashboard.stock.table.stock') }}</th>
                <th class="pb-2">{{ i18n.t('dashboard.stock.table.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in denreesCritiques.length ? denreesCritiques : stockStore.denreesAvecStatut.slice(0, 5)"
                :key="d.id"
                class="border-b border-gray-100"
              >
                <td class="py-2.5 pr-4 font-medium">{{ translateForUi(d.nom) }}</td>
                <td class="py-2.5 pr-4 text-gray-500">{{ CATEGORIE_LABELS[d.categorie] }}</td>
                <td class="py-2.5 pr-4">
                  {{ formatNumber(d.stockActuel) }} {{ UNITE_LABELS[d.unite] }}
                </td>
                <td class="py-2.5"><StockBadge :status="d.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <RouterLink to="/stock" class="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          {{ i18n.t('dashboard.stock.link') }}
        </RouterLink>
      </section>

      <section class="card">
        <h3 class="mb-4 font-semibold text-gray-900">{{ i18n.t('dashboard.courses.title') }}</h3>
        <div v-if="!manquants.length" class="py-8 text-center text-sm text-gray-500">
          {{ i18n.t('dashboard.noMissing') }}
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="b in manquants"
            :key="b.denreeId"
            class="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm"
          >
            <span class="font-medium text-red-900">{{ translateForUi(b.denree?.nom ?? '') }}</span>
            <span class="text-red-700">
              −{{ formatNumber(b.manquant) }} {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
            </span>
          </li>
        </ul>
        <RouterLink
          v-if="auth.canAccess('courses')"
          to="/courses"
          class="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          {{ i18n.t('dashboard.courses.link') }}
        </RouterLink>
      </section>
    </div>

    <section v-if="!presenceStore.pointageEffectue && auth.canAccess('presences')" class="mt-6 card border-l-4 border-blue-400">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📋</span>
        <div>
          <h3 class="font-semibold text-gray-900">{{ i18n.t('dashboard.attendance.pending.title') }}</h3>
          <p class="text-sm text-gray-600">
            {{ i18n.t('dashboard.attendance.pending.text') }}
          </p>
          <RouterLink to="/presences" class="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
            {{ i18n.t('dashboard.attendance.pending.link') }}
          </RouterLink>
        </div>
      </div>
    </section>
    </div>
  </div>
</template>
