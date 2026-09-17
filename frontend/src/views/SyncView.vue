<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useSyncStore } from '@/stores/sync'

const syncStore = useSyncStore()
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
  message.value = `${paquet.changes.length} modification(s) exportée(s).`
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
      error.value = result.error ?? 'Import impossible.'
      message.value = ''
    } else {
      message.value = `Paquet importé. ${result.conflits} conflit(s) à résoudre.`
      error.value = ''
    }
  } catch {
    error.value = 'Le fichier sélectionné n’est pas un paquet JSON valide.'
    message.value = ''
  } finally {
    input.value = ''
  }
}

function resolveConflict(id: string, decision: 'keep_existing' | 'accept_incoming') {
  syncStore.resoudreConflit(id, decision)
  message.value = 'Conflit résolu et décision enregistrée.'
}
</script>

<template>
  <div class="min-w-0">
    <PageHeader
      title="Synchronisation multi-sites"
      subtitle="Importez les données des écoles et résolvez les conflits en tant que responsable communal."
    />

    <div class="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
      Le rôle technique <strong>inspecteur</strong> correspond au responsable communal. Cette interface est en lecture seule sur les données des écoles.
    </div>

    <div v-if="message" class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ message }}</div>
    <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ error }}</div>

    <section class="mb-6 grid gap-4 md:grid-cols-3">
      <div class="card p-5">
        <p class="text-sm text-gray-500">École locale</p>
        <p class="mt-2 font-semibold text-gray-900">{{ syncStore.site.nom }}</p>
        <p class="mt-1 text-xs text-gray-500">{{ syncStore.site.id }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Écoles importées</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900">{{ syncStore.sitesImportes.length }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Conflits en attente</p>
        <p class="mt-2 text-3xl font-semibold text-amber-700">{{ syncStore.conflitsEnAttente.length }}</p>
      </div>
    </section>

    <section class="card mb-6 p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Échanges de données</h2>
          <p class="mt-1 text-sm text-gray-500">Les exports contiennent uniquement les changements depuis le dernier export local.</p>
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button type="button" class="btn-secondary w-full sm:w-auto" @click="downloadPackage">Exporter JSON</button>
          <button type="button" class="btn-primary w-full sm:w-auto" @click="openFilePicker">Importer JSON</button>
          <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="importPackage">
        </div>
      </div>
      <p class="mt-4 text-xs text-gray-500">
        Dernier export : {{ syncStore.lastExportAt ? new Date(syncStore.lastExportAt).toLocaleString('fr-FR') : 'jamais' }}
      </p>
    </section>

    <section class="card p-5">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Conflits à résoudre</h2>
        <p class="mt-1 text-sm text-gray-500">La décision manuelle du responsable communal prime sur la règle automatique du dernier modificateur.</p>
      </div>

      <div v-if="syncStore.conflitsEnAttente.length === 0" class="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        Aucun conflit en attente.
      </div>

      <div v-for="conflit in syncStore.conflitsEnAttente" :key="conflit.id" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 last:mb-0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-amber-900">{{ conflit.entity }} — {{ conflit.entityId }}</p>
            <p class="text-xs text-amber-800">École source : {{ conflit.sourceSiteId }}</p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" class="btn-secondary text-xs" @click="resolveConflict(conflit.id, 'keep_existing')">Garder l’existant</button>
            <button type="button" class="btn-primary text-xs" @click="resolveConflict(conflit.id, 'accept_incoming')">Accepter l’import</button>
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
