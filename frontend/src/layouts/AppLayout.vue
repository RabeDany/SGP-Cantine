<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ECOLE_INFO } from '@/data/mockData'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

interface NavItem {
  name: string
  to: string
  icon: string
  module: string
}

const allNav: NavItem[] = [
  { name: 'Tableau de bord', to: '/', icon: '📊', module: 'dashboard' },
  { name: 'Stock', to: '/stock', icon: '📦', module: 'stock' },
  { name: 'Denrées', to: '/denrees', icon: '🌾', module: 'denrees' },
  { name: 'Mouvements', to: '/mouvements', icon: '📝', module: 'mouvements' },
  { name: 'Recettes', to: '/recettes', icon: '🍲', module: 'recettes' },
  { name: 'Menu hebdo', to: '/menu', icon: '📅', module: 'menu' },
  { name: 'Liste de courses', to: '/courses', icon: '🛒', module: 'courses' },
  { name: 'Présences', to: '/presences', icon: '👥', module: 'presences' },
  { name: 'Utilisateurs', to: '/users', icon: '👤', module: 'users' },
]

const navItems = computed(() => allNav.filter((n) => auth.canAccess(n.module)))

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-earth-50">
    <aside class="flex w-64 shrink-0 flex-col border-r border-earth-200 bg-white">
      <div class="border-b border-earth-200 px-5 py-5">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">
            🍽
          </div>
          <div>
            <h1 class="text-sm font-bold text-gray-900">SGP-Cantine</h1>
            <p class="text-xs text-gray-500">{{ ECOLE_INFO.nom }}</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isActive(item.to)
              ? 'bg-brand-50 text-brand-800'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          "
        >
          <span>{{ item.icon }}</span>
          {{ item.name }}
        </RouterLink>
      </nav>

      <div class="border-t border-earth-200 p-4">
        <div class="mb-3 rounded-lg bg-earth-50 px-3 py-2">
          <p class="text-sm font-medium text-gray-900">{{ auth.currentUser?.nom }}</p>
          <p class="text-xs text-gray-500">
            {{ auth.roleLabel(auth.currentUser!.role) }}
          </p>
        </div>
        <button type="button" class="btn-secondary w-full text-xs" @click="logout">
          Déconnexion
        </button>
      </div>
    </aside>

    <main class="flex flex-1 flex-col overflow-hidden">
      <header class="border-b border-earth-200 bg-white px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-brand-600">
              {{ ECOLE_INFO.commune }} · {{ ECOLE_INFO.region }}
            </p>
          </div>
          <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Mode démo · Données mock
          </span>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto p-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
