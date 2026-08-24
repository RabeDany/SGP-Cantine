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

const canEditStatut = computed(() => auth.hasRole('admin'))
const isInspecteur = computed(() => auth.hasRole('inspecteur'))

const searchText = ref('')
const selectedType = ref<AnomalieType | 'all'>('all')
const selectedNiveau = ref<AnomalieNiveau | 'all'>('all')
const selectedStatut = ref<AnomalieStatut | 'all'>('all')
const startDate = ref('')
const endDate = ref('')
const actionError = ref('')
const actionMessage = ref('')
const justifyingId = ref<string | null>(null)
const justificationTexte = ref('')

function nomUtilisateur(userId?: string) {
  if (!userId) return '—'
  return auth.users.find((u) => u.id === userId)?.nom ?? userId
}

const typeOptions = computed(() => [
  { label: i18n.t('anomalie.filter.allTypes'), value: 'all' },
  { label: ANOMALIE_TYPE_LABELS.ecart_inventaire, value: 'ecart_inventaire' },
  { label: ANOMALIE_TYPE_LABELS.consommation_anormale, value: 'consommation_anormale' },
  { label: ANOMALIE_TYPE_LABELS.pointage_excessif, value: 'pointage_excessif' },
  { label: ANOMALIE_TYPE_LABELS.sortie_hors_horaire, value: 'sortie_hors_horaire' },
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

function ouvrirJustification(id: string) {
  if (!canEditStatut.value) return
  justifyingId.value = id
  justificationTexte.value = ''
  actionError.value = ''
  actionMessage.value = ''
}

function annulerJustification() {
  justifyingId.value = null
  justificationTexte.value = ''
}

function confirmerJustification() {
  if (!justifyingId.value || !canEditStatut.value) return
  const user = auth.currentUser
  const result = anomalieStore.mettreAJourStatut(
    justifyingId.value,
    'justifiee',
    user ? { id: user.id, nom: user.nom, role: user.role } : undefined,
    justificationTexte.value,
  )
  if (!result.ok) {
    actionError.value = result.error ?? 'Impossible de justifier.'
    return
  }
  actionMessage.value =
    'Anomalie justifiée. L’opération bloquée peut maintenant être re-saisie par l’agent ou le gestionnaire.'
  annulerJustification()
}

function marquerNonJustifiee(id: string) {
  if (!canEditStatut.value) return
  actionError.value = ''
  const user = auth.currentUser
  const result = anomalieStore.mettreAJourStatut(
    id,
    'non_justifiee',
    user ? { id: user.id, nom: user.nom, role: user.role } : undefined,
  )
  if (!result.ok) {
    actionError.value = result.error ?? 'Impossible de mettre à jour le statut.'
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('anomalie.title')"
      :subtitle="i18n.t('anomalie.subtitle')"
    />

    <div
      v-if="isInspecteur"
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
    >
      {{ i18n.t('anomalie.readOnly') }}
    </div>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.level3') }}</p>
        <p class="mt-2 text-3xl font-semibold text-red-700">{{ anomalieStore.statsAnomalies.niveau3 }}</p>
      </div>
      <div class="card p-4">
        <p class="text-sm text-gray-500">{{ i18n.t('anomalie.stats.justified') }}</p>
        <p class="mt-2 text-3xl font-semibold text-emerald-700">{{ anomalieStore.statsAnomalies.justifiees }}</p>
      </div>
    </div>

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

    <p v-if="actionMessage" class="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{{ actionMessage }}</p>
    <p v-if="actionError" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{{ actionError }}</p>

    <div
      v-if="justifyingId && canEditStatut"
      class="card mb-6 border border-emerald-200 bg-emerald-50"
    >
      <h3 class="font-semibold text-emerald-900">{{ i18n.t('anomalie.justify.title') }}</h3>
      <p class="mt-1 text-sm text-emerald-800">{{ i18n.t('anomalie.justify.help') }}</p>
      <textarea
        v-model="justificationTexte"
        class="input mt-3"
        rows="3"
        :placeholder="i18n.t('anomalie.justify.placeholder')"
      />
      <div class="mt-3 flex gap-2">
        <button type="button" class="btn-primary" @click="confirmerJustification">
          {{ i18n.t('anomalie.action.justify') }}
        </button>
        <button type="button" class="btn-secondary" @click="annulerJustification">
          {{ i18n.t('general.cancel') }}
        </button>
      </div>
    </div>

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

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.date') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.type') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.level') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.title') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.description') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.user') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.justification') }}</th>
            <th class="px-4 py-3">{{ i18n.t('anomalie.table.status') }}</th>
            <th v-if="canEditStatut" class="px-4 py-3">{{ i18n.t('anomalie.table.action') }}</th>
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
            <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
              {{ nomUtilisateur(anomalie.utilisateurId) }}
            </td>
            <td class="px-4 py-3 text-xs text-gray-600">
              <template v-if="anomalie.justification">
                {{ anomalie.justification }}
                <span v-if="anomalie.valideurNom" class="block text-gray-400">
                  — {{ anomalie.valideurNom }}
                </span>
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold" :class="statutBadgeClass(anomalie.statut)">
                {{ ANOMALIE_STATUT_LABELS[anomalie.statut] }}
              </span>
            </td>
            <td v-if="canEditStatut" class="px-4 py-3">
              <div v-if="anomalie.statut === 'en_cours'" class="flex flex-col gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200"
                  @click="ouvrirJustification(anomalie.id)"
                >
                  {{ i18n.t('anomalie.action.justify') }}
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200"
                  @click="marquerNonJustifiee(anomalie.id)"
                >
                  {{ i18n.t('anomalie.action.notJustified') }}
                </button>
              </div>
              <span v-else class="text-xs text-gray-400">{{ i18n.t('anomalie.action.closed') }}</span>
            </td>
          </tr>
          <tr v-if="filteredAnomalies.length === 0">
            <td :colspan="canEditStatut ? 9 : 8" class="px-4 py-6 text-center text-gray-500">
              {{ i18n.t('anomalie.noResults') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
