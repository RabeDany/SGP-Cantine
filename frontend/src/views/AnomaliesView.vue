<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAnomalieStore } from '@/stores/anomalie'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { ANOMALIE_NIVEAU_LABELS, ANOMALIE_STATUT_LABELS, ANOMALIE_TYPE_LABELS } from '@/types/anomalie'
import type { AnomalieNiveau, AnomalieStatut, AnomalieType } from '@/types/anomalie'

const anomalieStore = useAnomalieStore()
const auth = useAuthStore()
const i18n = useI18nStore()

const searchText = ref('')
const selectedType = ref<AnomalieType | 'all'>('all')
const selectedNiveau = ref<AnomalieNiveau | 'all'>('all')
const selectedStatut = ref<AnomalieStatut | 'all'>('all')
const startDate = ref('')
const endDate = ref('')

const typeOptions = computed(() => [
  { label: i18n.t('anomalie.filter.allTypes'), value: 'all' },
  { label: ANOMALIE_TYPE_LABELS.ecart_inventaire, value: 'ecart_inventaire' },
  { label: ANOMALIE_TYPE_LABELS.consommation_anormale, value: 'consommation_anormale' },
])

const niveauOptions = computed(() => [
  { label: i18n.t('anomalie.filter.allLevels'), value: 'all' },
  { label: ANOMALIE_NIVEAU_LABELS[1], value: 1 },
  { label: ANOMALIE_NIVEAU_LABELS[2], value: 2 },
  { label: ANOMALIE_NIVEAU_LABELS[3], value: 3 },
])

const statutOptions = computed(() => [
  { label: i18n.t('anomalie.filter.allStatuses'), value: 'all' },
  { label: ANOMALIE_STATUT_LABELS.en_cours, value: 'en_cours' },
  { label: ANOMALIE_STATUT_LABELS.justifiee, value: 'justifiee' },
  { label: ANOMALIE_STATUT_LABELS.non_justifiee, value: 'non_justifiee' },
])

const filteredAnomalies = computed(() => {
  return anomalieStore.anomalies.filter((anomalie) => {
    const matchesText = searchText.value
      ? anomalie.titre.toLowerCase().includes(searchText.value.toLowerCase()) ||
        anomalie.description.toLowerCase().includes(searchText.value.toLowerCase())
      : true
    const matchesType = selectedType.value === 'all' || anomalie.type === selectedType.value
    const matchesNiveau = selectedNiveau.value === 'all' || anomalie.niveau === selectedNiveau.value
    const matchesStatut = selectedStatut.value === 'all' || anomalie.statut === selectedStatut.value
    const matchesStart = startDate.value ? anomalie.dateDetection.slice(0, 10) >= startDate.value : true
    const matchesEnd = endDate.value ? anomalie.dateDetection.slice(0, 10) <= endDate.value : true
    return matchesText && matchesType && matchesNiveau && matchesStatut && matchesStart && matchesEnd
  })
})

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function niveauBadgeClass(niveau: AnomalieNiveau) {
  if (niveau === 3) return 'bg-red-100 text-red-800'
  if (niveau === 2) return 'bg-amber-100 text-amber-800'
  return 'bg-sky-100 text-sky-800'
}

function statutBadgeClass(statut: AnomalieStatut) {
  if (statut === 'justifiee') return 'bg-emerald-100 text-emerald-800'
  if (statut === 'non_justifiee') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-700'
}

function changerStatut(id: string, statut: AnomalieStatut) {
  const user = auth.currentUser
  anomalieStore.mettreAJourStatut(
    id,
    statut,
    user ? { id: user.id, nom: user.nom, role: user.role } : undefined,
  )
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('anomalie.title')"
      :subtitle="i18n.t('anomalie.subtitle')"
    />

    <!-- Statistiques -->
    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.total') }}</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ anomalieStore.statsAnomalies.total }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.active') }}</p>
        <p class="mt-2 text-3xl font-semibold text-amber-700">{{ anomalieStore.statsAnomalies.actives }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.level2') }}</p>
        <p class="mt-2 text-3xl font-semibold text-amber-700">{{ anomalieStore.statsAnomalies.niveau2 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.justified') }}</p>
        <p class="mt-2 text-3xl font-semibold text-emerald-700">{{ anomalieStore.statsAnomalies.justifiees }}</p>
      </div>
    </div>

    <!-- Alerte blocage niveau 3 -->
    <div
      v-if="anomalieStore.anomaliesNiveau3.length"
      class="mb-6 rounded-xl border border-red-300 bg-red-50 px-5 py-4"
    >
      <div class="flex items-start gap-3">
        <span class="text-2xl">🚨</span>
        <div>
          <h3 class="font-semibold text-red-900">
            {{ anomalieStore.anomaliesNiveau3.length }} {{ i18n.t('anomalie.blocking.title') }}
          </h3>
          <p class="mt-1 text-sm text-red-800">{{ i18n.t('anomalie.blocking.text') }}</p>
          <ul class="mt-2 space-y-1 text-sm text-red-800">
            <li v-for="a in anomalieStore.anomaliesNiveau3" :key="a.id">
              <strong>{{ a.titre }}</strong> — {{ a.description }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.search') }}</label>
        <input v-model="searchText" class="input" :placeholder="i18n.t('anomalie.filter.searchPlaceholder')" />
      </div>
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.type') }}</label>
        <select v-model="selectedType" class="input">
          <option v-for="option in typeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.level') }}</label>
        <select v-model="selectedNiveau" class="input">
          <option v-for="option in niveauOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.status') }}</label>
        <select v-model="selectedStatut" class="input">
          <option v-for="option in statutOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.startDate') }}</label>
        <input type="date" v-model="startDate" class="input" />
      </div>
      <div>
        <label class="label">{{ i18n.t('anomalie.filter.endDate') }}</label>
        <input type="date" v-model="endDate" class="input" />
      </div>
    </div>

    <!-- Journal -->
    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.date') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.type') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.level') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.title') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.description') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.status') }}</th>
            <th v-if="auth.hasRole('admin')" class="px-4 py-3">{{ i18n.t('anomalie.table.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="anomalie in filteredAnomalies" :key="anomalie.id" class="border-t border-gray-100">
            <td class="px-4 py-3 font-medium whitespace-nowrap">{{ formatTimestamp(anomalie.dateDetection) }}</td>
            <td class="px-4 py-3">{{ ANOMALIE_TYPE_LABELS[anomalie.type] }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" :class="niveauBadgeClass(anomalie.niveau)">
                {{ ANOMALIE_NIVEAU_LABELS[anomalie.niveau] }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-gray-900">{{ anomalie.titre }}</td>
            <td class="px-4 py-3 text-gray-600">{{ anomalie.description }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" :class="statutBadgeClass(anomalie.statut)">
                {{ ANOMALIE_STATUT_LABELS[anomalie.statut] }}
              </span>
            </td>
            <td v-if="auth.hasRole('admin')" class="px-4 py-3">
              <div v-if="anomalie.statut === 'en_cours'" class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                  @click="changerStatut(anomalie.id, 'justifiee')"
                >
                  {{ i18n.t('anomalie.action.justify') }}
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200"
                  @click="changerStatut(anomalie.id, 'non_justifiee')"
                >
                  {{ i18n.t('anomalie.action.notJustified') }}
                </button>
              </div>
              <span v-else class="text-xs text-gray-400">{{ i18n.t('anomalie.action.closed') }}</span>
            </td>
          </tr>
          <tr v-if="filteredAnomalies.length === 0">
            <td colspan="7" class="px-4 py-6 text-center text-gray-500">{{ i18n.t('anomalie.noResults') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>