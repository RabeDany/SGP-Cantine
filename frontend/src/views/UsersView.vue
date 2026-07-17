<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, type UserRole } from '@/types'

const auth = useAuthStore()
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
      title="Gestion des utilisateurs"
      subtitle="Création de comptes et attribution des 4 rôles (US-10)"
    />

    <div class="mb-4 flex justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button type="button" class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouvel utilisateur' }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div>
        <label class="label">Identifiant</label>
        <input v-model="form.username" class="input" required />
      </div>
      <div>
        <label class="label">Mot de passe</label>
        <input v-model="form.password" type="password" class="input" required />
      </div>
      <div>
        <label class="label">Nom complet</label>
        <input v-model="form.nom" class="input" required />
      </div>
      <div>
        <label class="label">Rôle</label>
        <select v-model="form.role" class="input">
          <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">Créer le compte</button>
      </div>
    </form>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Nom</th>
            <th class="px-5 py-3">Identifiant</th>
            <th class="px-5 py-3">Rôle</th>
            <th class="px-5 py-3">Statut</th>
            <th class="px-5 py-3">Actions</th>
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
                {{ u.actif ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="px-5 py-3">
              <button
                v-if="u.id !== auth.currentUser?.id"
                type="button"
                class="text-xs text-brand-600 hover:underline"
                @click="auth.toggleUserActive(u.id)"
              >
                {{ u.actif ? 'Désactiver' : 'Activer' }}
              </button>
              <span v-else class="text-xs text-gray-400">Compte courant</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <strong>US-11 :</strong> Chaque rôle n'accède qu'aux modules autorisés après connexion.
      Testez avec les comptes démo sur la page de login.
    </div>
  </div>
</template>
