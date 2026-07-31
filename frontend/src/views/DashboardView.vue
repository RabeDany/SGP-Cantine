<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import StockBadge from '@/components/StockBadge.vue'
import { useStockStore } from '@/stores/stock'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { CATEGORIE_LABELS, UNITE_LABELS } from '@/types'
import { formatDate, formatNumber } from '@/utils/helpers'

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
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('dashboard.title')"
      :subtitle="i18n.t('dashboard.subtitle', { user: auth.currentUser?.nom ?? '' })"
    />

    <!-- Alertes péremption US-05 -->
    <div
      v-if="alertesPeremption.length"
      class="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4"
    >
      <div class="flex items-start gap-3">
        <span class="text-xl">⚠️</span>
        <div>
          <h3 class="font-semibold text-amber-900">
            {{ alertesPeremption.length }} {{ i18n.t('dashboard.alertPeremption') }}
          </h3>
          <ul class="mt-2 space-y-1 text-sm text-amber-800">
            <li v-for="d in alertesPeremption" :key="d.id">
              <strong>{{ d.nom }}</strong> — {{ i18n.t('dashboard.stock.expiration') }}
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
      <StatCard :label="i18n.t('dashboard.cards.denrees')" :value="stats.total" icon="📦" color="blue" />
      <StatCard :label="i18n.t('dashboard.cards.ok')" :value="stats.ok" icon="✅" color="green" />
      <StatCard :label="i18n.t('dashboard.cards.low')" :value="stats.warning + stats.critical" icon="⚠️" color="amber" />
      <StatCard
        :label="i18n.t('dashboard.cards.presences')"
        :value="presenceStore.pointageEffectue ? presenceStore.totalPresentsAujourdhui : '—'"
        icon="👥"
        color="gray"
      />
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
                <td class="py-2.5 pr-4 font-medium">{{ d.nom }}</td>
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
            <span class="font-medium text-red-900">{{ b.denree?.nom }}</span>
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
</template>
