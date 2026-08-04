import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockUsers } from '@/data/mockData'
import { createMockJwt, hashPassword, loadFromStorage, saveToStorage } from '@/utils/helpers'
import type { User, UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

const SESSION_KEY = 'session'

interface Session {
  userId: string
  expiresAt: number
  token: string
}

export const useAuthStore = defineStore('auth', () => {
  const users = ref<User[]>(loadFromStorage('users', [...mockUsers]))
  const session = ref<Session | null>(loadFromStorage('session', null))

  const currentUser = computed(() => {
    if (!session.value) return null
    if (Date.now() > session.value.expiresAt) {
      logout()
      return null
    }
    return users.value.find((u) => u.id === session.value!.userId && u.actif) ?? null
  })

  const isAuthenticated = computed(() => !!currentUser.value)

  function login(username: string, password: string): { ok: boolean; error?: string } {
    const hashedPassword = hashPassword(password)
    const user = users.value.find(
      (u) =>
        u.username === username &&
        (u.password === hashedPassword || u.password === password) &&
        u.actif,
    )
    if (!user) {
      return { ok: false, error: 'Identifiant ou mot de passe incorrect.' }
    }
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000
    session.value = {
      userId: user.id,
      expiresAt,
      token: createMockJwt(user.id, expiresAt),
    }
    saveToStorage(SESSION_KEY, session.value)
    return { ok: true }
  }

  function logout() {
    session.value = null
    localStorage.removeItem('sgp-cantine-session')
  }

  function hasRole(...roles: UserRole[]): boolean {
    return !!currentUser.value && roles.includes(currentUser.value.role)
  }

  function canAccess(module: string): boolean {
    if (!currentUser.value) return false
    const role = currentUser.value.role
    const access: Record<UserRole, string[]> = {
      admin: ['dashboard', 'stock', 'inventaire', 'denrees', 'mouvements', 'recettes', 'menu', 'courses', 'fournisseurs', 'commandes', 'presences', 'users', 'rapports'],
      gestionnaire: ['dashboard', 'stock', 'inventaire', 'denrees', 'mouvements', 'fournisseurs', 'commandes','courses', 'rapports'],
      planificateur: ['dashboard', 'stock', 'recettes', 'menu', 'courses', 'rapports'],
      agent: ['dashboard', 'stock', 'presences'],
    }
    return access[role]?.includes(module) ?? false
  }

  function createUser(data: Omit<User, 'id'>) {
    const id = `u_${Date.now()}`
    users.value.push({
      ...data,
      password: data.password ? hashPassword(data.password) : data.password,
      id,
    })
    persistUsers()
    return id
  }

  function updateUser(id: string, data: Partial<Omit<User, 'id'>>) {
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx >= 0) {
      users.value[idx] = {
        ...users.value[idx],
        ...data,
        password: data.password ? hashPassword(data.password) : users.value[idx].password,
      }
      persistUsers()
    }
  }

  function toggleUserActive(id: string) {
    const user = users.value.find((u) => u.id === id)
    if (user && user.id !== currentUser.value?.id) {
      user.actif = !user.actif
      persistUsers()
    }
  }

  function persistUsers() {
    saveToStorage('users', users.value)
  }

  function roleLabel(role: UserRole) {
    return ROLE_LABELS[role]
  }

  return {
    users,
    currentUser,
    isAuthenticated,
    login,
    logout,
    hasRole,
    canAccess,
    createUser,
    updateUser,
    toggleUserActive,
    roleLabel,
  }
})
