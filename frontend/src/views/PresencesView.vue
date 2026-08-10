<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { usePresenceStore } from '@/stores/presence'
import { formatDate } from '@/utils/helpers'

const auth = useAuthStore()
const i18n = useI18nStore()
const presenceStore = usePresenceStore()

const mode = ref<'global' | 'classe'>('global')
const message = ref('')
const error = ref('')

const globalForm = ref({ presents: 0, exemptions: 0 })

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
  const result = presenceStore.enregistrerPointageGlobal({
    ...globalForm.value,
    userId: auth.currentUser!.id,
  })
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

    <div class="mb-4 flex gap-2">
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

    <form v-if="mode === 'global'" class="card max-w-md space-y-4" @submit.prevent="submitGlobal">
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

    <div v-else class="card overflow-x-auto p-0">
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
                :max="classe.inscritsCantine"
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

    <section class="mt-8 card">
      <h3 class="mb-3 font-semibold">{{ i18n.t('presences.history.title') }}</h3>
      <ul class="space-y-2 text-sm">
        <li
          v-for="p in presenceStore.pointages.slice(0, 7)"
          :key="p.id"
          class="flex justify-between border-b border-gray-100 py-2"
        >
          <span>{{ formatDate(p.date) }}</span>
          <span>{{ p.presents }} / {{ p.inscrits }} présents</span>
        </li>
      </ul>
    </section>
  </div>
</template>
