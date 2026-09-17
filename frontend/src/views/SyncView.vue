<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useSyncStore } from '@/stores/sync'
import { useI18nStore } from '@/stores/i18n'

const syncStore = useSyncStore()
const i18n = useI18nStore()
const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const error = ref('')

function downloadPackage() {
  const paquet = syncStore.exporterDepuisDerniereSynchronisation()
  const blob = new Blob([JSON.stringify(paquet, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${paquet.sourceSite.id}-${paquet.packageId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
  error.value = ''
  message.value = i18n.t('sync.exported', { count: paquet.changes.length })
}

function openFilePicker() {
  fileInput.value?.click()
}

async function importPackage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const paquet = JSON.parse(await file.text())
    const result = syncStore.importerPaquet(paquet)
    if (!result.ok) {
      error.value = result.error ?? i18n.t('sync.importImpossible')
      message.value = ''
    } else {
      message.value = i18n.t('sync.imported', { count: result.conflits })
      error.value = ''
    }
  } catch {
    error.value = i18n.t('sync.invalidFile')
    message.value = ''
  } finally {
    input.value = ''
  }
}

function resolveConflict(id: string, decision: 'keep_existing' | 'accept_incoming') {
  syncStore.resoudreConflit(id, decision)
  message.value = i18n.t('sync.conflictResolved')
}
</script>

<template>
  <div class="min-w-0">
    <PageHeader
      :title="i18n.t('sync.title')"
      :subtitle="i18n.t('sync.subtitle')"
    />

    <div class="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
      {{ i18n.t('sync.readOnly') }}
    </div>

    <div v-if="message" class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ message }}</div>
    <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</div>

    <section class="mb-6 grid gap-4 md:grid-cols-3">
      <div class="card p-5">
        <p class="text-sm text-gray-500">{{ i18n.t('sync.localSchool') }}</p>
        <p class="mt-2 font-semibold text-gray-900">{{ syncStore.site.nom }}</p>
        <p class="mt-1 text-xs text-gray-500">{{ syncStore.site.id }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">{{ i18n.t('sync.importedSchools') }}</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ syncStore.sitesImportes.length }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">{{ i18n.t('sync.pendingConflicts') }}</p>
        <p class="mt-2 text-3xl font-semibold text-amber-700">{{ syncStore.conflitsEnAttente.length }}</p>
      </div>
    </section>

    <section class="card mb-6 p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('sync.dataExchange') }}</h2>
          <p class="mt-1 text-sm text-gray-500">{{ i18n.t('sync.dataExchangeSubtitle') }}</p>
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button type="button" class="btn-secondary w-full sm:w-auto" @click="downloadPackage">{{ i18n.t('sync.exportJson') }}</button>
          <button type="button" class="btn-primary w-full sm:w-auto" @click="openFilePicker">{{ i18n.t('sync.importJson') }}</button>
          <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="importPackage">
        </div>
      </div>
      <p class="mt-4 text-xs text-gray-500">
        {{ i18n.t('sync.lastExport') }} : {{ syncStore.lastExportAt ? new Date(syncStore.lastExportAt).toLocaleString('fr-FR') : i18n.t('sync.never') }}
      </p>
    </section>

    <section class="card p-5">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ i18n.t('sync.conflictsTitle') }}</h2>
        <p class="mt-1 text-sm text-gray-500">{{ i18n.t('sync.conflictsSubtitle') }}</p>
      </div>

      <div v-if="syncStore.conflitsEnAttente.length === 0" class="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        {{ i18n.t('sync.noConflicts') }}
      </div>

      <div v-for="conflit in syncStore.conflitsEnAttente" :key="conflit.id" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 last:mb-0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-amber-900">{{ conflit.entity }} — {{ conflit.entityId }}</p>
            <p class="text-xs text-amber-800">{{ i18n.t('sync.sourceSchool') }} : {{ conflit.sourceSiteId }}</p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" class="btn-secondary text-xs" @click="resolveConflict(conflit.id, 'keep_existing')">{{ i18n.t('sync.keepExisting') }}</button>
            <button type="button" class="btn-primary text-xs" @click="resolveConflict(conflit.id, 'accept_incoming')">{{ i18n.t('sync.acceptImport') }}</button>
          </div>
        </div>
        <div class="mt-3 grid gap-3 text-xs md:grid-cols-2">
          <pre class="overflow-auto rounded bg-white p-3 text-gray-700">{{ JSON.stringify(conflit.existing, null, 2) }}</pre>
          <pre class="overflow-auto rounded bg-white p-3 text-gray-700">{{ JSON.stringify(conflit.incoming, null, 2) }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>
