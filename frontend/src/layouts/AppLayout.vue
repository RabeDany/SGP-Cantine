<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { useCommandeStore } from '@/stores/commande'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import { ECOLE_INFO } from '@/data/mockData'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const commandeStore = useCommandeStore()
const menuStore = useMenuStore()
const presenceStore = usePresenceStore()
const stockStore = useStockStore()
const i18n = useI18nStore()
const showNotifications = ref(false)
const sidebarCollapsed = ref(false)

interface NavItem {
  labelKey: string
  to: string
  icon: string
  module: string
}

const allNav: NavItem[] = [
  { labelKey: 'nav.dashboard', to: '/', icon: 'chart-bar', module: 'dashboard' },
  { labelKey: 'nav.stock', to: '/stock', icon: 'box', module: 'stock' },
  { labelKey: 'nav.inventaire', to: '/inventaire', icon: 'document', module: 'inventaire' },
  { labelKey: 'nav.denrees', to: '/denrees', icon: 'leaf', module: 'denrees' },
  { labelKey: 'nav.mouvements', to: '/mouvements', icon: 'pencil', module: 'mouvements' },
  { labelKey: 'nav.recettes', to: '/recettes', icon: 'bowl', module: 'recettes' },
  { labelKey: 'nav.menu', to: '/menu', icon: 'calendar', module: 'menu' },
  { labelKey: 'nav.presences', to: '/presences', icon: 'check-circle', module: 'presences' },
  { labelKey: 'nav.courses', to: '/courses', icon: 'shopping-cart', module: 'courses' },
  { labelKey: 'nav.prevision', to: '/prevision', icon: 'chart-line', module: 'prevision' },
  { labelKey: 'nav.rapports', to: '/rapports', icon: 'chart-line', module: 'rapports' },
  { labelKey: 'nav.audit', to: '/audit', icon: 'shield-check', module: 'audit' },
  { labelKey: 'nav.anomalies', to: '/anomalies', icon: 'warning', module: 'anomalie' },
  { labelKey: 'nav.communal', to: '/communal', icon: 'chart-bar', module: 'communal' },
  { labelKey: 'nav.fournisseurs', to: '/fournisseurs', icon: 'store', module: 'fournisseurs' },
  { labelKey: 'nav.commandes', to: '/commandes', icon: 'receipt', module: 'commandes' },
  { labelKey: 'nav.users', to: '/users', icon: 'user', module: 'users' },
]

const navItems = computed(() => allNav.filter((n) => auth.canAccess(n.module)))
const sidebarWidthClass = computed(() => (sidebarCollapsed.value ? 'w-20' : 'w-64'))

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function logout() {
  auth.logout()
  router.push('/login')
}

const notifications = computed(() => {
  const list: Array<{ id: string; title: string; message: string; type: 'info' | 'warning' | 'danger' }> = []
  const role = auth.currentUser?.role

  if (role === 'planificateur' && presenceStore.pointageEffectue) {
    list.push({
      id: 'pointage-termine',
      title: 'Pointage finalisé',
      message: 'L’agent de cantine a terminé le pointage du jour.',
      type: 'info',
    })
  }

  if (role === 'admin' || role === 'gestionnaire') {
    const pendingValidation = commandeStore.bonsCommande.find(
      (bon) => bon.statut === 'emitted' && bon.emetteurId !== auth.currentUser?.id,
    )
    if (pendingValidation) {
      list.push({
        id: `bon-${pendingValidation.id}`,
        title: 'Signature de bon en attente',
        message: `Le bon ${pendingValidation.id} attend votre validation.`,
        type: 'warning',
      })
    }

    if (menuStore.denreesManquantes.length) {
      list.push({
        id: 'menu-stock',
        title: 'Stock insuffisant pour le menu',
        message: `${menuStore.denreesManquantes.length} denrée(s) manquent pour le menu en cours.`,
        type: 'warning',
      })
    }

    const stockCritique = stockStore.denreesAvecStatut.filter((d) => d.status === 'critical')
    if (stockCritique.length) {
      const names = stockCritique.map((d) => d.nom).join(', ')
      list.push({
        id: 'stock-critique',
        title: 'Stock critique',
        message: `${names} ${stockCritique.length > 1 ? 'sont' : 'est'} à un niveau critique.`,
        type: 'danger',
      })
    }
  }

  return list
})
</script>

<template>
  <div class="flex min-h-screen bg-earth-50">
    <aside :class="['flex shrink-0 flex-col border-r border-earth-200 bg-white transition-all duration-200', sidebarWidthClass]">
      <div class="border-b border-earth-200 px-3 py-4">
        <div class="flex items-center gap-2">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="bowl" className="h-6 w-6" />
          </div>

          <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
            <h1 class="truncate text-sm font-bold text-gray-900">SGP-Cantine</h1>
            <p class="truncate text-xs text-gray-500">{{ ECOLE_INFO.nom }}</p>
          </div>

    
        </div>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-brand-50 text-brand-800'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            sidebarCollapsed ? 'justify-center px-2' : 'justify-start',
          ]"
          :title="sidebarCollapsed ? i18n.t(item.labelKey) : undefined"
        >
          <Icon :name="item.icon" className="h-5 w-5 shrink-0" />
          <span v-if="!sidebarCollapsed" class="truncate">{{ i18n.t(item.labelKey) }}</span>
        </RouterLink>
      </nav>

      <div class="border-t border-earth-200 p-4">
        <div v-if="!sidebarCollapsed" class="mb-3 rounded-lg bg-earth-50 px-3 py-2">
          <p class="text-sm font-medium text-gray-900">{{ auth.currentUser?.nom }}</p>
          <p class="text-xs text-gray-500">
            {{ auth.roleLabel(auth.currentUser!.role) }}
          </p>
        </div>
        <button type="button" class="btn-secondary w-full text-xs" @click="logout">
          <span v-if="!sidebarCollapsed">{{ i18n.t('header.logout') }}</span>
          <Icon v-else name="user" className="h-4 w-4 mx-auto" />
        </button>
      </div>
    </aside>

    <main class="flex flex-1 flex-col overflow-hidden">
      <header class="border-b border-earth-200 bg-white px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-earth-200 bg-white text-gray-700 transition hover:bg-gray-100"
              :title="sidebarCollapsed ? 'Ouvrir la sidebar' : 'Réduire la sidebar'"
              @click="sidebarCollapsed = !sidebarCollapsed"
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
            <p class="text-xs font-medium uppercase tracking-wide text-brand-600">
              {{ ECOLE_INFO.commune }} · {{ ECOLE_INFO.region }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 rounded-full border border-earth-200 bg-earth-50 px-3 py-1 text-xs text-gray-600">
              <span>{{ i18n.t('header.language') }}:</span>
              <div class="flex items-center rounded-full bg-white p-1">
                <button
                  type="button"
                  @click="i18n.setLanguage('fr')"
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    i18n.language === 'fr' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                  ]"
                >
                  FR
                </button>
                <button
                  type="button"
                  @click="i18n.setLanguage('mg')"
                  :class="[
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    i18n.language === 'mg' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                  ]"
                >
                  MG
                </button>
              </div>
            </div>
            <div class="relative">
              <button
                v-if="notifications.length"
                type="button"
                class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                @click="showNotifications = !showNotifications"
              >
                🔔 {{ notifications.length }} {{ i18n.t('header.notifications') }}
              </button>
              <div
                v-if="showNotifications && notifications.length"
                class="absolute right-0 top-10 z-20 w-80 rounded-xl border border-earth-200 bg-white p-3 shadow-lg"
              >
                <div class="mb-2 flex items-center justify-between">
                  <p class="text-sm font-semibold text-gray-900">Notifications</p>
                  <button type="button" class="text-xs text-gray-500" @click="showNotifications = false">Fermer</button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="notif in notifications"
                    :key="notif.id"
                    class="rounded-lg border border-gray-200 p-2 text-sm"
                    :class="{
                      'bg-amber-50': notif.type === 'warning',
                      'bg-red-50': notif.type === 'danger',
                      'bg-sky-50': notif.type === 'info',
                    }"
                  >
                    <p class="font-medium text-gray-900">{{ notif.title }}</p>
                    <p class="text-xs text-gray-600">{{ notif.message }}</p>
                  </div>
                </div>
              </div>
            </div>
            <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Mode démo · Données mock
            </span>
          </div>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto p-8">
        <RouterView v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="route.name" class="page-content" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>
