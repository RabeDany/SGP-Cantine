<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { usePresenceStore } from '@/stores/presence'
import { formatDate } from '@/utils/helpers'

const auth = useAuthStore()
const i18n = useI18nStore()
const presenceStore = usePresenceStore()

const isInspecteur = computed(() => auth.currentUser?.role === 'inspecteur')
const isHistoryAuthorized = computed(() => ['admin', 'inspecteur'].includes(auth.currentUser?.role ?? ''))
const canEditPresence = computed(() => ['admin', 'agent'].includes(auth.currentUser?.role ?? ''))

const selectedClass = ref<string>('all')
const selectedPeriod = ref<'day' | 'week' | 'month'>('day')
const mode = ref<'global' | 'classe'>('global')
const message = ref('')
const error = ref('')

const globalForm = ref({ presents: 0, exemptions: 0 })

const classOptions = computed(() => [
  { id: 'all', nom: 'École / Toutes les classes' },
  ...presenceStore.classes.map((classe) => ({ id: classe.id, nom: `${classe.nom} (${classe.niveau})` })),
])

const historyRows = computed(() => {
  const classId = selectedClass.value === 'all' ? null : selectedClass.value
  return presenceStore.getPresenceHistorySummary(classId, selectedPeriod.value)
})

const averageRate = computed(() => {
  if (!historyRows.value.length) return 0
  const total = historyRows.value.reduce((sum, row) => sum + row.taux, 0)
  return Math.round(total / historyRows.value.length)
})

const attendanceSeries = computed(() => {
  const rows = historyRows.value.slice(-7)
  const maxTaux = rows.length ? Math.max(100, ...rows.map((row) => row.taux)) : 100
  return rows.map((row, index) => {
    const x = 20 + index * 70
    const y = 90 - (row.taux / maxTaux) * 70
    return { ...row, x, y }
  })
})

const chartPath = computed(() => {
  if (!attendanceSeries.value.length) return ''
  return attendanceSeries.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')
})

const absenteeismRate = computed(() => {
  if (!historyRows.value.length) return 0
  const total = historyRows.value.reduce((sum, row) => sum + (100 - row.taux), 0)
  return Math.round(total / historyRows.value.length)
})

function initGlobalForm() {
  if (presenceStore.pointageDuJour) {
    globalForm.value = {
      presents: presenceStore.pointageDuJour.presents,
      exemptions: presenceStore.pointageDuJour.exemptions,
    }
  } else {
    globalForm.value = { presents: 0, exemptions: 0 }
  }
}
initGlobalForm()

function submitGlobal() {
  error.value = ''
  message.value = ''
  const result = presenceStore.enregistrerPointageGlobal(
    {
      ...globalForm.value,
      userId: auth.currentUser!.id,
    },
    auth.currentUser
      ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role }
      : undefined,
  )
  if (!result.ok) {
    error.value = result.error!
    return
  }
  message.value = 'Pointage enregistré avec succès.'
}

function updateClasse(classeId: string, presents: number) {
  error.value = ''
  message.value = ''
  const result = presenceStore.enregistrerPointageParClasse(
    classeId,
    presents,
    0,
    auth.currentUser!.id,
    auth.currentUser
      ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role }
      : undefined,
  )
  if (!result.ok) {
    error.value = result.error!
    return
  }
  message.value = 'Pointage classe mis à jour.'
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('presences.title')"
      :subtitle="i18n.t('presences.subtitle')"
    />

    <div v-if="canEditPresence" class="mb-4 flex gap-2">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        :class="mode === 'global' ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-gray-200'"
        @click="mode = 'global'"
      >
        {{ i18n.t('presences.tab.global') }}
      </button>
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        :class="mode === 'classe' ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-gray-200'"
        @click="mode = 'classe'"
      >
        {{ i18n.t('presences.tab.classe') }}
      </button>
    </div>

    <div v-if="isInspecteur" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      Accès en lecture seule — historique des présences réservé au directeur et au Responsable Communal / Inspecteur.
    </div>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <div class="card">
        <p class="text-xs text-gray-500">{{ i18n.t('presences.card.inscrits') }}</p>
        <p class="text-2xl font-bold">{{ presenceStore.totalInscrits }}</p>
      </div>
      <div class="card">
        <p class="text-xs text-gray-500">{{ i18n.t('presences.card.presents') }}</p>
        <p class="text-2xl font-bold text-brand-700">
          {{ presenceStore.pointageEffectue ? presenceStore.totalPresentsAujourdhui : i18n.t('general.none') }}
        </p>
      </div>
      <div class="card">
        <p class="text-xs text-gray-500">{{ i18n.t('presences.card.rate') }}</p>
        <p class="text-2xl font-bold">
          {{
            presenceStore.pointageEffectue
              ? Math.round(
                  (presenceStore.totalPresentsAujourdhui / presenceStore.totalInscrits) * 100,
                ) + ' %'
              : '—'
          }}
        </p>
      </div>
    </div>

    <p v-if="message" class="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{{ message }}</p>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{{ error }}</p>

    <form v-if="canEditPresence && mode === 'global'" class="card max-w-md space-y-4" @submit.prevent="submitGlobal">
      <h3 class="font-semibold">{{ i18n.t('presences.form.global') }}</h3>
      <div>
        <label class="label">{{ i18n.t('presences.label.presentStudents') }}</label>
        <input v-model.number="globalForm.presents" type="number" min="0" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('presences.label.exemptions') }}</label>
        <input v-model.number="globalForm.exemptions" type="number" min="0" class="input" />
      </div>
      <button type="submit" class="btn-primary">{{ i18n.t('presences.form.save') }}</button>
    </form>

    <div v-else-if="canEditPresence" class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('presences.table.class') }}</th>
            <th class="px-5 py-3">{{ i18n.t('presences.table.inscrits') }}</th>
            <th class="px-5 py-3">{{ i18n.t('presences.table.presents') }}</th>
            <th class="px-5 py-3">{{ i18n.t('presences.table.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ classe, pointage } in presenceStore.pointagesParClasseAujourdhui" :key="classe.id" class="border-t">
            <td class="px-5 py-3 font-medium">{{ classe.nom }} ({{ classe.niveau }})</td>
            <td class="px-5 py-3">{{ classe.inscritsCantine }}</td>
            <td class="px-5 py-3">
              <input
                type="number"
                min="0"
                class="input w-24"
                :value="pointage?.presents ?? 0"
                @change="
                  updateClasse(classe.id, Number(($event.target as HTMLInputElement).value))
                "
              />
            </td>
            <td class="px-5 py-3 text-xs text-gray-500">
              {{ pointage ? i18n.t('presences.status.saved') : i18n.t('presences.status.notRecorded') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="isHistoryAuthorized" class="mt-8 card">
      <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 class="font-semibold">{{ i18n.t('presences.history.title') }}</h3>
        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <select v-model="selectedClass" class="input w-full md:w-52">
            <option v-for="option in classOptions" :key="option.id" :value="option.id">
              {{ option.nom }}
            </option>
          </select>
          <div class="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium"
              :class="selectedPeriod === 'day' ? 'bg-brand-600 text-white' : 'text-gray-600'"
              @click="selectedPeriod = 'day'"
            >
              Jour
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium"
              :class="selectedPeriod === 'week' ? 'bg-brand-600 text-white' : 'text-gray-600'"
              @click="selectedPeriod = 'week'"
            >
              Semaine
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium"
              :class="selectedPeriod === 'month' ? 'bg-brand-600 text-white' : 'text-gray-600'"
              @click="selectedPeriod = 'month'"
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      <div class="mb-4 grid gap-3 sm:grid-cols-4">
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">Période</p>
          <p class="mt-1 text-lg font-semibold">
            {{ selectedPeriod === 'day' ? 'Jour' : selectedPeriod === 'week' ? 'Semaine' : 'Mois' }}
          </p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">Taux moyen de fréquentation</p>
          <p class="mt-1 text-lg font-semibold">{{ averageRate }}%</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">Taux moyen d'absentéisme</p>
          <p class="mt-1 text-lg font-semibold">{{ absenteeismRate }}%</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500">Périodes affichées</p>
          <p class="mt-1 text-lg font-semibold">{{ historyRows.length }}</p>
        </div>
      </div>

      <div class="mb-4 rounded-3xl bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">Courbe de fréquentation</p>
            <p class="text-sm text-gray-600">Dernières périodes sélectionnées</p>
          </div>
          <p class="text-sm font-semibold text-brand-700">{{ averageRate }}% fréquentation</p>
        </div>
        <div class="relative h-44 overflow-hidden rounded-2xl bg-slate-50 p-3">
          <svg viewBox="0 0 560 110" class="h-full w-full">
            <path d="M20 10 H540" stroke="#CBD5E1" stroke-width="1" />
            <path d="M20 40 H540" stroke="#E2E8F0" stroke-width="1" />
            <path d="M20 70 H540" stroke="#E2E8F0" stroke-width="1" />
            <path d="M20 100 H540" stroke="#E2E8F0" stroke-width="1" />
            <path
              v-if="chartPath"
              :d="chartPath"
              fill="none"
              stroke="#2563EB"
              stroke-width="3"
              stroke-linecap="round"
            />
            <path
              v-if="chartPath"
              :d="chartPath"
              fill="none"
              stroke="#93C5FD"
              stroke-width="10"
              stroke-linecap="round"
              opacity="0.15"
            />
            <g v-for="point in attendanceSeries" :key="point.key">
              <circle :cx="point.x" :cy="point.y" r="4" fill="#2563EB" />
              <text :x="point.x" :y="point.y - 10" text-anchor="middle" font-size="10" fill="#334155">
                {{ point.taux }}%
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th class="px-3 py-2">Période</th>
              <th class="px-3 py-2">Présents</th>
              <th class="px-3 py-2">Inscrits</th>
              <th class="px-3 py-2">Taux fréquentation</th>
              <th class="px-3 py-2">Taux absentéisme</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historyRows.slice().reverse()" :key="row.key" class="border-t border-gray-100">
              <td class="px-3 py-2 font-medium">{{ row.label }}</td>
              <td class="px-3 py-2">{{ row.presents }}</td>
              <td class="px-3 py-2">{{ row.inscrits }}</td>
              <td class="px-3 py-2">
                <span :class="row.taux >= 80 ? 'text-green-700' : row.taux >= 60 ? 'text-amber-700' : 'text-red-700'">
                  {{ row.taux }}%
                </span>
              </td>
              <td class="px-3 py-2">
                <span :class="row.taux <= 20 ? 'text-green-700' : row.taux <= 40 ? 'text-amber-700' : 'text-red-700'">
                  {{ 100 - row.taux }}%
                </span>
              </td>
            </tr>
            <tr v-if="!historyRows.length">
              <td colspan="5" class="px-3 py-4 text-center text-gray-500">
                Aucune donnée de fréquentation pour cette période.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
