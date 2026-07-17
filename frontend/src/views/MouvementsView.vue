<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useStockStore } from '@/stores/stock'
import {
  MOTIF_LABELS,
  PROVENANCE_LABELS,
  UNITE_LABELS,
  type MotifSortie,
  type ProvenanceStock,
} from '@/types'
import { formatDate, formatNumber, todayISO } from '@/utils/helpers'

const auth = useAuthStore()
const stockStore = useStockStore()

const tab = ref<'entree' | 'sortie' | 'historique'>('entree')
const message = ref('')
const error = ref('')

const entreeForm = ref({
  denreeId: '',
  date: todayISO(),
  quantite: 0,
  provenance: 'achat_local' as ProvenanceStock,
  prixAchat: undefined as number | undefined,
  numeroBon: '',
  datePeremption: '',
})

const sortieForm = ref({
  denreeId: '',
  date: todayISO(),
  quantite: 0,
  motif: 'preparation_repas' as MotifSortie,
  commentaire: '',
})

function submitEntree() {
  error.value = ''
  message.value = ''
  const result = stockStore.enregistrerEntree({
    ...entreeForm.value,
    userId: auth.currentUser!.id,
    prixAchat: entreeForm.value.prixAchat || undefined,
    numeroBon: entreeForm.value.numeroBon || undefined,
    datePeremption: entreeForm.value.datePeremption || undefined,
  })
  if (!result.ok) {
    error.value = result.error!
    return
  }
  message.value = 'Entrée enregistrée — stock mis à jour.'
  entreeForm.value.quantite = 0
  entreeForm.value.numeroBon = ''
}

function submitSortie() {
  error.value = ''
  message.value = ''
  const result = stockStore.enregistrerSortie({
    ...sortieForm.value,
    userId: auth.currentUser!.id,
    commentaire: sortieForm.value.commentaire || undefined,
  })
  if (!result.ok) {
    error.value = result.error!
    return
  }
  message.value = 'Sortie enregistrée — stock mis à jour.'
  sortieForm.value.quantite = 0
  sortieForm.value.commentaire = ''
}

function getDenreeNom(id: string) {
  return stockStore.getDenree(id)?.nom ?? id
}
</script>

<template>
  <div>
    <PageHeader
      title="Mouvements de stock"
      subtitle="Entrées (US-02) et sorties avec blocage si stock insuffisant (US-03)"
    />

    <div class="mb-4 flex gap-2">
      <button
        v-for="t in [
          { id: 'entree', label: 'Entrée' },
          { id: 'sortie', label: 'Sortie' },
          { id: 'historique', label: 'Historique' },
        ]"
        :key="t.id"
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium"
        :class="
          tab === t.id
            ? 'bg-brand-600 text-white'
            : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
        "
        @click="tab = t.id as typeof tab"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="message" class="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{{ message }}</p>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{{ error }}</p>

    <form v-if="tab === 'entree'" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submitEntree">
      <div class="sm:col-span-2">
        <label class="label">Denrée</label>
        <select v-model="entreeForm.denreeId" class="input" required>
          <option value="">— Sélectionner —</option>
          <option v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" :value="d.id">
            {{ d.nom }} ({{ formatNumber(d.stockActuel) }} {{ UNITE_LABELS[d.unite] }})
          </option>
        </select>
      </div>
      <div>
        <label class="label">Date</label>
        <input v-model="entreeForm.date" type="date" class="input" required />
      </div>
      <div>
        <label class="label">Quantité</label>
        <input v-model.number="entreeForm.quantite" type="number" min="0.01" step="0.01" class="input" required />
      </div>
      <div>
        <label class="label">Provenance</label>
        <select v-model="entreeForm.provenance" class="input">
          <option v-for="(label, key) in PROVENANCE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="label">Prix d'achat (Ar, optionnel)</label>
        <input v-model.number="entreeForm.prixAchat" type="number" min="0" class="input" />
      </div>
      <div>
        <label class="label">N° bon d'entrée</label>
        <input v-model="entreeForm.numeroBon" class="input" placeholder="BE-2026-001" />
      </div>
      <div>
        <label class="label">Nouvelle date péremption</label>
        <input v-model="entreeForm.datePeremption" type="date" class="input" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">Enregistrer l'entrée</button>
      </div>
    </form>

    <form v-if="tab === 'sortie'" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submitSortie">
      <div class="sm:col-span-2">
        <label class="label">Denrée</label>
        <select v-model="sortieForm.denreeId" class="input" required>
          <option value="">— Sélectionner —</option>
          <option v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" :value="d.id">
            {{ d.nom }} ({{ formatNumber(d.stockActuel) }} {{ UNITE_LABELS[d.unite] }})
          </option>
        </select>
      </div>
      <div>
        <label class="label">Date</label>
        <input v-model="sortieForm.date" type="date" class="input" required />
      </div>
      <div>
        <label class="label">Quantité</label>
        <input v-model.number="sortieForm.quantite" type="number" min="0.01" step="0.01" class="input" required />
      </div>
      <div>
        <label class="label">Motif</label>
        <select v-model="sortieForm.motif" class="input">
          <option v-for="(label, key) in MOTIF_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <label class="label">Commentaire {{ sortieForm.motif === 'avarie' ? '(obligatoire)' : '' }}</label>
        <textarea v-model="sortieForm.commentaire" class="input" rows="2" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">Enregistrer la sortie</button>
      </div>
    </form>

    <div v-if="tab === 'historique'" class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Date</th>
            <th class="px-5 py-3">Type</th>
            <th class="px-5 py-3">Denrée</th>
            <th class="px-5 py-3">Quantité</th>
            <th class="px-5 py-3">Détail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in stockStore.mouvementsRecents" :key="m.id" class="border-t">
            <td class="px-5 py-3">{{ formatDate(m.date) }}</td>
            <td class="px-5 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="m.type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'"
              >
                {{ m.type === 'entree' ? 'Entrée' : 'Sortie' }}
              </span>
            </td>
            <td class="px-5 py-3 font-medium">{{ getDenreeNom(m.denreeId) }}</td>
            <td class="px-5 py-3">{{ formatNumber(m.quantite) }}</td>
            <td class="px-5 py-3 text-gray-500 text-xs">
              <template v-if="m.type === 'entree'">
                {{ m.provenance ? PROVENANCE_LABELS[m.provenance] : '' }}
                {{ m.numeroBon ? `· ${m.numeroBon}` : '' }}
              </template>
              <template v-else>
                {{ m.motif ? MOTIF_LABELS[m.motif] : '' }}
                {{ m.commentaire ? `· ${m.commentaire}` : '' }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
