<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuditStore } from '@/stores/audit'
import { useI18nStore } from '@/stores/i18n'
import type { AuditActionType } from '@/types'

const auditStore = useAuditStore()
const i18n = useI18nStore()

const searchUser = ref('')
const selectedAction = ref<AuditActionType | 'all'>('all')
const startDate = ref('')
const endDate = ref('')

const actionOptions = computed(() => [
  { label: 'Toutes les actions', value: 'all' },
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

const integrityStatus = computed(() => (auditStore.verifyChain() ? 'OK' : 'ALTÉRÉ'))
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('audit.title')"
      :subtitle="i18n.t('audit.subtitle')"
    />

    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">{{ i18n.t('audit.filter.user') }}</label>
        <input v-model="searchUser" class="input" :placeholder="i18n.t('audit.filter.userPlaceholder')" />
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
          <input type="date" v-model="startDate" class="input" />
        </div>
        <div>
          <label class="label">{{ i18n.t('audit.filter.endDate') }}</label>
          <input type="date" v-model="endDate" class="input" />
        </div>
      </div>
    </div>

    <div class="card mb-6 p-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-gray-500">{{ i18n.t('audit.integrity') }} : <span class="font-semibold">{{ integrityStatus }}</span></p>
          <p class="text-xs text-gray-500">{{ i18n.t('audit.notice') }}</p>
        </div>
        <div class="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          {{ filteredEntries.length }} {{ i18n.t('audit.entries') }}
        </div>
      </div>
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
          <tr v-for="entry in filteredEntries" :key="entry.id" class="border-t border-gray-100">
            <td class="px-4 py-3 font-medium">{{ formatTimestamp(entry.timestamp) }}</td>
            <td class="px-4 py-3">{{ entry.userName }}</td>
            <td class="px-4 py-3">{{ entry.role }}</td>
            <td class="px-4 py-3">{{ entry.actionLabel }}</td>
            <td class="px-4 py-3">{{ entry.description }}</td>
            <td class="px-4 py-3">{{ entry.location }}</td>
          </tr>
          <tr v-if="filteredEntries.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-500">{{ i18n.t('audit.noResults') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
