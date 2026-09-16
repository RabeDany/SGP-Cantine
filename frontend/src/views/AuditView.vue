<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuditStore } from '@/stores/audit'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import type { AuditActionType, AuditReportDestination } from '@/types'

const auditStore = useAuditStore()
const auth = useAuthStore()
const i18n = useI18nStore()

const searchUser = ref('')
const selectedAction = ref<AuditActionType | 'all'>('all')
const startDate = ref('')
const endDate = ref('')
const destination = ref<AuditReportDestination>('autorites_scolaires')
const verifying = ref(false)
const exporting = ref(false)
const message = ref('')
const error = ref('')

const actionOptions = computed(() => [
  { label: i18n.t('audit.filter.allActions'), value: 'all' as const },
  ...auditStore.actionTypes.map((type: AuditActionType) => ({ label: type, value: type })),
])

const filteredEntries = computed(() => {
  return auditStore.entries.filter((entry) => {
    const matchesUser = searchUser.value
      ? entry.userName.toLowerCase().includes(searchUser.value.toLowerCase())
      : true
    const matchesAction = selectedAction.value === 'all' || entry.actionType === selectedAction.value
    const matchesStart = startDate.value ? entry.timestamp.slice(0, 10) >= startDate.value : true
    const matchesEnd = endDate.value ? entry.timestamp.slice(0, 10) <= endDate.value : true
    return matchesUser && matchesAction && matchesStart && matchesEnd
  })
})

const verification = computed(() => auditStore.lastVerification)

const brokenId = computed(() => verification.value?.brokenEntryId)

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

function currentUserRef() {
  return auth.currentUser
    ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role }
    : undefined
}

async function verifierIntegrite() {
  error.value = ''
  message.value = ''
  verifying.value = true
  try {
    const result = await auditStore.verifyChain()
    await auditStore.logVerification(result, currentUserRef())
    message.value = result.valid
      ? i18n.t('audit.verify.ok', { count: result.checkedCount, ms: result.durationMs })
      : i18n.t('audit.verify.broken', {
          id: result.brokenEntryId ?? '—',
          reason: result.reason ?? '',
        })
  } catch (e) {
    error.value = e instanceof Error ? e.message : i18n.t('audit.verify.error')
  } finally {
    verifying.value = false
  }
}

async function exporterJson() {
  error.value = ''
  message.value = ''
  exporting.value = true
  try {
    await auditStore.exportAuditReport(destination.value, currentUserRef())
    message.value = i18n.t('audit.export.done')
  } catch (e) {
    error.value = e instanceof Error ? e.message : i18n.t('audit.export.error')
  } finally {
    exporting.value = false
  }
}

async function exporterPdf() {
  error.value = ''
  message.value = ''
  exporting.value = true
  try {
    await auditStore.printAuditReport(destination.value, currentUserRef())
    message.value = i18n.t('audit.print.done')
  } catch (e) {
    error.value = e instanceof Error ? e.message : i18n.t('audit.export.error')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  void auditStore.migrateLegacyChainIfNeeded()
})
</script>

<template>
  <div>
    <PageHeader :title="i18n.t('audit.title')" :subtitle="i18n.t('audit.subtitle')" />

    <div
      v-if="auth.currentUser?.role === 'inspecteur'"
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
    >
      {{ i18n.t('audit.readOnly') }}
    </div>

    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">{{ i18n.t('audit.filter.user') }}</label>
        <input
          v-model="searchUser"
          class="input"
          :placeholder="i18n.t('audit.filter.userPlaceholder')"
        />
      </div>
      <div>
        <label class="label">{{ i18n.t('audit.filter.action') }}</label>
        <select v-model="selectedAction" class="input">
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">{{ i18n.t('audit.filter.startDate') }}</label>
          <input v-model="startDate" type="date" class="input" />
        </div>
        <div>
          <label class="label">{{ i18n.t('audit.filter.endDate') }}</label>
          <input v-model="endDate" type="date" class="input" />
        </div>
      </div>
    </div>

    <div class="card mb-6 space-y-4 p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-sm text-gray-500">
            {{ i18n.t('audit.integrity') }} :
            <span
              class="font-semibold"
              :class="{
                'text-emerald-700': verification?.valid === true,
                'text-red-700': verification?.valid === false,
                'text-gray-700': verification == null,
              }"
            >
              {{
                verification == null
                  ? i18n.t('audit.integrity.unknown')
                  : verification.valid
                    ? i18n.t('audit.integrity.ok')
                    : i18n.t('audit.integrity.broken')
              }}
            </span>
          </p>
          <p class="mt-1 text-xs text-gray-500">{{ i18n.t('audit.notice') }}</p>
          <p
            v-if="verification && !verification.valid"
            class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {{ i18n.t('audit.verify.detail', {
              id: verification.brokenEntryId ?? '—',
              reason: verification.reason ?? '',
            }) }}
          </p>
        </div>
        <div class="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          {{ filteredEntries.length }} {{ i18n.t('audit.entries') }}
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          class="btn-primary"
          :disabled="verifying"
          @click="verifierIntegrite"
        >
          {{ verifying ? i18n.t('audit.verify.loading') : i18n.t('audit.verify.button') }}
        </button>

        <div>
          <label class="label text-xs">{{ i18n.t('audit.destination') }}</label>
          <select v-model="destination" class="input min-w-[200px]">
            <option value="autorites_scolaires">
              {{ auditStore.destinationLabels.autorites_scolaires }}
            </option>
            <option value="bailleurs_fonds">
              {{ auditStore.destinationLabels.bailleurs_fonds }}
            </option>
          </select>
        </div>

        <button
          type="button"
          class="btn-secondary"
          :disabled="exporting"
          @click="exporterJson"
        >
          {{ i18n.t('audit.export.json') }}
        </button>
        <button
          type="button"
          class="btn-secondary"
          :disabled="exporting"
          @click="exporterPdf"
        >
          {{ i18n.t('audit.export.pdf') }}
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
      <p v-if="message" class="text-sm text-emerald-800">{{ message }}</p>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">{{ i18n.t('audit.table.timestamp') }}</th>
            <th class="px-4 py-3">{{ i18n.t('audit.table.user') }}</th>
            <th class="px-4 py-3">{{ i18n.t('audit.table.role') }}</th>
            <th class="px-4 py-3">{{ i18n.t('audit.table.action') }}</th>
            <th class="px-4 py-3">{{ i18n.t('audit.table.description') }}</th>
            <th class="px-4 py-3">{{ i18n.t('audit.table.location') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in filteredEntries"
            :key="entry.id"
            class="border-t border-gray-100"
            :class="{ 'bg-red-50': brokenId === entry.id }"
          >
            <td class="px-4 py-3 font-medium">{{ formatTimestamp(entry.timestamp) }}</td>
            <td class="px-4 py-3">{{ entry.userName }}</td>
            <td class="px-4 py-3">{{ entry.role }}</td>
            <td class="px-4 py-3">{{ entry.actionLabel }}</td>
            <td class="px-4 py-3">{{ entry.description }}</td>
            <td class="px-4 py-3 text-xs text-gray-600">{{ entry.location }}</td>
          </tr>
          <tr v-if="filteredEntries.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-500">
              {{ i18n.t('audit.noResults') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
