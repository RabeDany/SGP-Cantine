<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { useStockStore } from '@/stores/stock'
import { UNITE_LABELS, type IngredientRecette, type RecetteCategorie } from '@/types'
import { formatNumber } from '@/utils/helpers'

const menuStore = useMenuStore()
const stockStore = useStockStore()
const showForm = ref(false)
const success = ref('')

const form = ref({
  nom: '',
  categorie: 'dejeuner' as RecetteCategorie,
  instructions: '',
  ingredients: [{ denreeId: '', quantiteParPortion: 0.1 }] as IngredientRecette[],
})

function addIngredient() {
  form.value.ingredients.push({ denreeId: '', quantiteParPortion: 0.1 })
}

function removeIngredient(i: number) {
  form.value.ingredients.splice(i, 1)
}

function submit() {
  const validIngredients = form.value.ingredients.filter(
    (i) => i.denreeId && i.quantiteParPortion > 0,
  )
  if (!form.value.nom.trim() || !validIngredients.length) return

  menuStore.createRecette({
    nom: form.value.nom,
    categorie: form.value.categorie,
    instructions: form.value.instructions,
    ingredients: validIngredients,
  })
  success.value = `Recette « ${form.value.nom} » créée.`
  form.value = {
    nom: '',
    categorie: 'dejeuner',
    instructions: '',
    ingredients: [{ denreeId: '', quantiteParPortion: 0.1 }],
  }
  showForm.value = false
  setTimeout(() => (success.value = ''), 3000)
}

function getDenreeNom(id: string) {
  return stockStore.getDenree(id)?.nom ?? '?'
}
</script>

<template>
  <div>
    <PageHeader
      title="Recettes"
      subtitle="Référentiel avec ingrédients par portion (US-06)"
    />

    <div class="mb-4 flex justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button type="button" class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Annuler' : '+ Nouvelle recette' }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 space-y-4" @submit.prevent="submit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">Nom</label>
          <input v-model="form.nom" class="input" required />
        </div>
        <div>
          <label class="label">Catégorie</label>
          <select v-model="form.categorie" class="input">
            <option value="dejeuner">Déjeuner</option>
            <option value="complement">Complément nutritionnel</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">Instructions</label>
        <textarea v-model="form.instructions" class="input" rows="3" />
      </div>
      <div>
        <label class="label">Ingrédients (par portion)</label>
        <div v-for="(ing, i) in form.ingredients" :key="i" class="mb-2 flex gap-2">
          <select v-model="ing.denreeId" class="input flex-1" required>
            <option value="">— Denrée —</option>
            <option v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" :value="d.id">
              {{ d.nom }}
            </option>
          </select>
          <input
            v-model.number="ing.quantiteParPortion"
            type="number"
            min="0.001"
            step="0.001"
            class="input w-32"
            required
          />
          <button type="button" class="btn-secondary px-2" @click="removeIngredient(i)">✕</button>
        </div>
        <button type="button" class="text-sm text-brand-600 hover:underline" @click="addIngredient">
          + Ajouter un ingrédient
        </button>
      </div>
      <button type="submit" class="btn-primary">Enregistrer</button>
    </form>

    <div class="grid gap-4 md:grid-cols-2">
      <article
        v-for="r in menuStore.recettesActives"
        :key="r.id"
        class="card"
        :class="{ 'opacity-60': !r.valide }"
      >
        <div class="mb-3 flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">{{ r.nom }}</h3>
            <p class="text-xs text-gray-500 capitalize">{{ r.categorie.replace('_', ' ') }}</p>
          </div>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="r.valide ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
          >
            {{ r.valide ? 'Valide' : 'Incomplète' }}
          </span>
        </div>
        <p class="mb-3 text-sm text-gray-600">{{ r.instructions }}</p>
        <ul class="space-y-1 text-sm">
          <li v-for="ing in r.ingredients" :key="ing.denreeId" class="flex justify-between text-gray-700">
            <span>{{ getDenreeNom(ing.denreeId) }}</span>
            <span class="text-gray-500">
              {{ formatNumber(ing.quantiteParPortion, 3) }}
              {{ stockStore.getDenree(ing.denreeId) ? UNITE_LABELS[stockStore.getDenree(ing.denreeId)!.unite] : '' }}
              / portion
            </span>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
