<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import Icon from '@/components/Icon.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const demoAccounts = [
  { user: 'directeur', pass: 'directeur123', role: 'Administrateur' },
  { user: 'stock', pass: 'stock123', role: 'Gestionnaire stock' },
  { user: 'cuisine', pass: 'cuisine123', role: 'Planificateur' },
  { user: 'agent', pass: 'agent123', role: 'Agent cantine' },
]

function fillDemo(user: string, pass: string) {
  username.value = user
  password.value = pass
}

async function submit() {
  error.value = ''
  loading.value = true
  const result = auth.login(username.value, password.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.error ?? 'Erreur de connexion.'
    return
  }
  const redirect = (route.query.redirect as string) || '/'
  router.push(redirect)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-earth-50 to-brand-100 p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
          <Icon name="bowl" className="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ i18n.t('login.title') }}</h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ i18n.t('login.subtitle') }}<br />
          <span class="text-brand-700">Androy · Anosy · Madagascar</span>
        </p>
      </div>

      <form class="card space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="username">{{ i18n.t('login.username') }}</label>
          <input id="username" v-model="username" class="input" autocomplete="username" required />
        </div>
        <div>
          <label class="label" for="password">{{ i18n.t('login.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Connexion…' : i18n.t('login.connect') }}
        </button>
      </form>

      <div class="mt-6 card">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {{ i18n.t('login.demoAccounts') }}
        </p>
        <div class="space-y-2">
          <button
            v-for="acc in demoAccounts"
            :key="acc.user"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
            @click="fillDemo(acc.user, acc.pass)"
          >
            <span class="font-medium text-gray-800">{{ acc.user }}</span>
            <span class="text-xs text-gray-500">{{ acc.role }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
