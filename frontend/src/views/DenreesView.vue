<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useStockStore } from '@/stores/stock'
import {
  CATEGORIE_LABELS,
  UNITE_LABELS,
  type DenreeCategorie,
  type UniteMesure,
} from '@/types'
import { formatNumber, todayISO } from '@/utils/helpers'

const stockStore = useStockStore()
const showForm = ref(false)
const success = ref('')

const form = ref({
  nom: '',
  categorie: 'cereale' as DenreeCategorie,
  unite: 'kg' as UniteMesure,
  seuilAlerte: 10,
  dureeConservationJours: 90,
  datePeremption: '',
  stockInitial: 0,
})

function resetForm() {
  form.value = {
    nom: '',
    categorie: 'cereale',
    unite: 'kg',
    seuilAlerte: 10,
    dureeConservationJours: 90,
    datePeremption: '',
    stockInitial: 0,
  }
}

function submit() {
  if (!form.value.nom.trim()) return
  stockStore.createDenree({
    ...form.value,
    datePeremption: form.value.datePeremption || undefined,
  })
  success.value = `Denrée « ${form.value.nom} » créée.`
  resetForm()
  showForm.value = false
  setTimeout(() => (success.value = ''), 3000)
}
</script>

<template>
  <div>
    <PageHeader
      title="Référentiel des denrées"
      subtitle="Création et gestion des fiches denrées (US-01)"
    />

    <div class="mb-4 flex items-center justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button type="button" class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouvelle denrée' }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div class="sm:col-span-2">
        <label class="label">Nom</label>
        <input v-model="form.nom" class="input" required placeholder="Ex. Riz blanc" />
      </div>
      <div>
        <label class="label">Catégorie</label>
        <select v-model="form.categorie" class="input">
          <option v-for="(label, key) in CATEGORIE_LABELS" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">Unité</label>
        <select v-model="form.unite" class="input">
          <option v-for="(label, key) in UNITE_LABELS" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">Seuil d'alerte</label>
        <input v-model.number="form.seuilAlerte" type="number" min="0" step="0.1" class="input" required />
      </div>
      <div>
        <label class="label">Durée conservation (jours)</label>
        <input v-model.number="form.dureeConservationJours" type="number" min="1" class="input" required />
      </div>
      <div>
        <label class="label">Date péremption (optionnel)</label>
        <input v-model="form.datePeremption" type="date" class="input" :min="todayISO()" />
      </div>
      <div>
        <label class="label">Stock initial</label>
        <input v-model.number="form.stockInitial" type="number" min="0" step="0.1" class="input" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">Enregistrer la fiche</button>
      </div>
    </form>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Nom</th>
            <th class="px-5 py-3">Catégorie</th>
            <th class="px-5 py-3">Unité</th>
            <th class="px-5 py-3">Seuil</th>
            <th class="px-5 py-3">Stock</th>
            <th class="px-5 py-3">Conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" class="border-t">
            <td class="px-5 py-3 font-medium">{{ d.nom }}</td>
            <td class="px-5 py-3">{{ CATEGORIE_LABELS[d.categorie] }}</td>
            <td class="px-5 py-3">{{ UNITE_LABELS[d.unite] }}</td>
            <td class="px-5 py-3">{{ formatNumber(d.seuilAlerte) }}</td>
            <td class="px-5 py-3">{{ formatNumber(d.stockActuel) }}</td>
            <td class="px-5 py-3 text-gray-500">{{ d.dureeConservationJours }} j.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
