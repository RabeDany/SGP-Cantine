<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { ROLE_LABELS, type UserRole } from '@/types'

const auth = useAuthStore()
const i18n = useI18nStore()
const showForm = ref(false)
const success = ref('')

const form = ref({
  username: '',
  password: '',
  nom: '',
  role: 'agent' as UserRole,
})

function submit() {
  if (!form.value.username.trim() || !form.value.password.trim() || !form.value.nom.trim()) return
  if (auth.users.some((u) => u.username === form.value.username)) {
    alert('Ce nom d\'utilisateur existe déjà.')
    return
  }
  auth.createUser({ ...form.value, actif: true })
  success.value = `Compte « ${form.value.username} » créé.`
  form.value = { username: '', password: '', nom: '', role: 'agent' }
  showForm.value = false
  setTimeout(() => (success.value = ''), 3000)
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('users.title')"
      :subtitle="i18n.t('users.subtitle')"
    />

    <div class="mb-4 flex justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button type="button" class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? i18n.t('general.cancel') : i18n.t('users.button.new') }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div>
        <label class="label">{{ i18n.t('users.label.username') }}</label>
        <input v-model="form.username" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('users.label.password') }}</label>
        <input v-model="form.password" type="password" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('users.label.name') }}</label>
        <input v-model="form.nom" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('users.label.role') }}</label>
        <select v-model="form.role" class="input">
          <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">{{ i18n.t('users.button.create') }}</button>
      </div>
    </form>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('users.table.name') }}</th>
            <th class="px-5 py-3">{{ i18n.t('users.table.username') }}</th>
            <th class="px-5 py-3">{{ i18n.t('users.table.role') }}</th>
            <th class="px-5 py-3">{{ i18n.t('users.table.status') }}</th>
            <th class="px-5 py-3">{{ i18n.t('users.table.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in auth.users" :key="u.id" class="border-t">
            <td class="px-5 py-3 font-medium">{{ u.nom }}</td>
            <td class="px-5 py-3 text-gray-600">{{ u.username }}</td>
            <td class="px-5 py-3">
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{{ ROLE_LABELS[u.role] }}</span>
            </td>
            <td class="px-5 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="u.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              >
                {{ u.actif ? i18n.t('users.status.active') : i18n.t('users.status.inactive') }}
              </span>
            </td>
            <td class="px-5 py-3">
              <button
                v-if="u.id !== auth.currentUser?.id"
                type="button"
                class="text-xs text-brand-600 hover:underline"
                @click="auth.toggleUserActive(u.id)"
              >
                {{ u.actif ? i18n.t('users.action.deactivate') : i18n.t('users.action.activate') }}
              </button>
              <span v-else class="text-xs text-gray-400">{{ i18n.t('users.action.currentAccount') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <strong>US-11 :</strong> {{ i18n.t('users.note') }}
    </div>
  </div>
</template>
