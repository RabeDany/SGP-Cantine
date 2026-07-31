<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { UNITE_LABELS } from '@/types'
import { formatNumber } from '@/utils/helpers'

const router = useRouter()
const auth = useAuthStore()
const i18n = useI18nStore()
const menuStore = useMenuStore()
const presenceStore = usePresenceStore()

const portionsUtilisees = computed(() =>
  presenceStore.pointageEffectue
    ? presenceStore.totalPresentsAujourdhui
    : menuStore.menuActuel.jours[0]?.portionsPrevues ?? 0,
)

const totalArticles = computed(() => menuStore.listeCourses.length)
const totalQuantite = computed(() =>
  menuStore.listeCourses.reduce((sum, b) => sum + b.quantiteNecessaire, 0),
)
const totalStock = computed(() =>
  menuStore.listeCourses.reduce((sum, b) => sum + b.stockDisponible, 0),
)
const totalManquants = computed(() =>
  menuStore.denreesManquantes.reduce((s, b) => s + b.manquant, 0),
)
const calculMode = computed(() =>
  presenceStore.pointageEffectue ? i18n.t('courses.mode.present') : i18n.t('courses.mode.planned'),
)

function createBonFromCourses() {
  router.push({ name: 'commandes', query: { fromCourses: '1' } })
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('courses.title')"
      :subtitle="i18n.t('courses.subtitle')"
    />

    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="grid gap-4 sm:grid-cols-4 flex-1">
        <div class="card">
          <p class="text-xs text-gray-500">{{ i18n.t('courses.card.referencePortions') }}</p>
          <p class="text-2xl font-bold">{{ portionsUtilisees }}</p>
          <p class="text-xs text-gray-400">{{ calculMode }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-gray-500">{{ i18n.t('courses.card.totalItems') }}</p>
          <p class="text-2xl font-bold">{{ totalArticles }}</p>
          <p class="text-xs text-gray-400">{{ i18n.t('courses.card.lines') }}</p>
        </div>
        <div class="card">
          <p class="text-xs text-gray-500">{{ i18n.t('courses.card.totalQuantity') }}</p>
          <p class="text-2xl font-bold">{{ formatNumber(totalQuantite) }}</p>
          <p class="text-xs text-gray-400">{{ i18n.t('courses.card.weeklyQuantity') }}</p>
        </div>
        <div class="card" :class="totalManquants > 0 ? 'border-red-200 bg-red-50' : ''">
          <p class="text-xs text-gray-500">{{ i18n.t('courses.card.missingQuantity') }}</p>
          <p class="text-2xl font-bold" :class="totalManquants > 0 ? 'text-red-700' : 'text-green-700'">
            {{ formatNumber(totalManquants) }}
          </p>
          <p class="text-xs" :class="totalManquants > 0 ? 'text-red-600' : 'text-green-600'">
            {{ i18n.t('courses.requiresOrder', { count: menuStore.denreesManquantes.length }) }}
          </p>
        </div>
      </div>

      <button
        v-if="auth.canAccess('commandes')"
        type="button"
        class="btn-primary h-12 w-full sm:w-auto"
        :disabled="!menuStore.denreesManquantes.length"
        @click="createBonFromCourses"
      >
        Créer un bon depuis les besoins
      </button>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500 uppercase tracking-wide">
            <th class="px-5 py-3">{{ i18n.t('courses.table.ingredients') }}</th>
            <th class="px-5 py-3">{{ i18n.t('courses.table.need') }}</th>
            <th class="px-5 py-3">{{ i18n.t('courses.table.available') }}</th>
            <th class="px-5 py-3">{{ i18n.t('courses.table.missing') }}</th>
            <th class="px-5 py-3">{{ i18n.t('courses.table.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="b in menuStore.listeCourses"
            :key="b.denreeId"
            class="border-t"
            :class="b.manque ? 'bg-red-50' : 'bg-white'"
          >
            <td class="px-5 py-3 font-medium" :class="b.manque ? 'text-red-900' : 'text-slate-800'">
              {{ b.denree?.nom }}
            </td>
            <td class="px-5 py-3">
              {{ formatNumber(b.quantiteNecessaire) }}
              {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
            </td>
            <td class="px-5 py-3 text-slate-700">
              {{ formatNumber(b.stockDisponible) }}
              {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
            </td>
            <td class="px-5 py-3 font-semibold" :class="b.manque ? 'text-red-700' : 'text-gray-400'">
              <template v-if="b.manque">
                {{ formatNumber(b.manquant) }} {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
              </template>
              <template v-else>—</template>
            </td>
            <td class="px-5 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="b.manque ? 'bg-red-200 text-red-900' : 'bg-emerald-100 text-emerald-800'"
              >
                {{ b.manque ? 'À commander' : 'Suffisant' }}
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-slate-50 text-sm font-semibold text-slate-700">
          <tr>
            <td class="px-5 py-3">Totaux</td>
            <td class="px-5 py-3">{{ formatNumber(totalQuantite) }}</td>
            <td class="px-5 py-3">{{ formatNumber(totalStock) }}</td>
            <td class="px-5 py-3">{{ totalManquants > 0 ? formatNumber(totalManquants) : '—' }}</td>
            <td class="px-5 py-3">&nbsp;</td>
          </tr>
        </tfoot>
      </table>
      <p v-if="!menuStore.listeCourses.length" class="p-8 text-center text-gray-500">
        {{ i18n.t('courses.notCalculated') }}
      </p>
    </div>
  </div>
</template>
