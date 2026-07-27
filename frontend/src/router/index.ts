import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { module: 'dashboard' },
        },
        {
          path: 'stock',
          name: 'stock',
          component: () => import('@/views/StockView.vue'),
          meta: { module: 'stock' },
        },
        {
          path: 'denrees',
          name: 'denrees',
          component: () => import('@/views/DenreesView.vue'),
          meta: { module: 'denrees', roles: ['admin', 'gestionnaire'] },
        },
        {
          path: 'mouvements',
          name: 'mouvements',
          component: () => import('@/views/MouvementsView.vue'),
          meta: { module: 'mouvements', roles: ['admin', 'gestionnaire'] },
        },
        {
          path: 'recettes',
          name: 'recettes',
          component: () => import('@/views/RecettesView.vue'),
          meta: { module: 'recettes', roles: ['admin', 'planificateur'] },
        },
        {
          path: 'menu',
          name: 'menu',
          component: () => import('@/views/MenuView.vue'),
          meta: { module: 'menu', roles: ['admin', 'planificateur'] },
        },
        {
          path: 'courses',
          name: 'courses',
          component: () => import('@/views/ListeCoursesView.vue'),
          meta: { module: 'courses', roles: ['admin', 'planificateur'] },
        },
        {
          path: 'fournisseurs',
          name: 'fournisseurs',
          component: () => import('@/views/FournisseursView.vue'),
          meta: { module: 'fournisseurs', roles: ['admin', 'gestionnaire'] },
        },
        {
          path: 'commandes',
          name: 'commandes',
          component: () => import('@/views/CommandesView.vue'),
          meta: { module: 'commandes', roles: ['admin', 'gestionnaire'] },
        },
        {
          path: 'presences',
          name: 'presences',
          component: () => import('@/views/PresencesView.vue'),
          meta: { module: 'presences' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { module: 'users', roles: ['admin'] },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') return '/'
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const module = to.meta.module as string | undefined
  if (module && !auth.canAccess(module)) {
    return { name: 'dashboard' }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.currentUser && !roles.includes(auth.currentUser.role)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
