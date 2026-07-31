<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { useMenuStore } from '@/stores/menu'
import { useStockStore } from '@/stores/stock'
import { UNITE_LABELS, type IngredientRecette, type RecetteCategorie } from '@/types'
import { formatNumber } from '@/utils/helpers'
import { translateForUi } from '@/utils/foodTranslator'

const menuStore = useMenuStore()
const stockStore = useStockStore()
const auth = useAuthStore()
const i18n = useI18nStore()
const showForm = ref(false)
const success = ref('')
const editingId = ref<string | null>(null)

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
  if (!auth.hasRole('admin', 'planificateur')) return
  if (editingId.value) {
    menuStore.updateRecette(editingId.value, {
      nom: form.value.nom,
      categorie: form.value.categorie,
      instructions: form.value.instructions,
      ingredients: validIngredients,
    })
    success.value = i18n.t('recettes.button.save') + ` — ${form.value.nom}`
  } else {
    menuStore.createRecette({
      nom: form.value.nom,
      categorie: form.value.categorie,
      instructions: form.value.instructions,
      ingredients: validIngredients,
    })
    success.value = i18n.t('recettes.button.new') + ` — ${form.value.nom}`
  }
  form.value = {
    nom: '',
    categorie: 'dejeuner',
    instructions: '',
    ingredients: [{ denreeId: '', quantiteParPortion: 0.1 }],
  }
  showForm.value = false
  editingId.value = null
  setTimeout(() => (success.value = ''), 3000)
}

function startEdit(r: any) {
  editingId.value = r.id
  form.value = {
    nom: r.nom,
    categorie: r.categorie,
    instructions: r.instructions ?? '',
    ingredients: r.ingredients.map((ing: any) => ({ ...ing })),
  }
  showForm.value = true
}

function removeRecette(id: string) {
  if (!auth.hasRole('admin', 'planificateur')) return
  if (!confirm(i18n.t('recettes.button.save') + ' — ' + i18n.t('recettes.label.name') + '?')) return
  menuStore.deleteRecette(id)
  success.value = i18n.t('recettes.button.save') + ' — ' + id
  setTimeout(() => (success.value = ''), 3000)
}

function toggleForm() {
  showForm.value = !showForm.value
  if (!showForm.value) editingId.value = null
}

function getDenreeNom(id: string) {
  return stockStore.getDenree(id)?.nom ?? '?'
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('recettes.title')"
      :subtitle="i18n.t('recettes.subtitle')"
    />

    <div class="mb-4 flex justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button
        v-if="auth.hasRole('admin','planificateur')"
        type="button"
        class="btn-primary"
        @click="toggleForm"
      >
        {{ showForm ? i18n.t('general.cancel') : i18n.t('recettes.button.new') }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 space-y-4" @submit.prevent="submit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label">{{ i18n.t('recettes.label.name') }}</label>
          <input v-model="form.nom" class="input" required />
        </div>
        <div>
          <label class="label">{{ i18n.t('recettes.label.category') }}</label>
          <select v-model="form.categorie" class="input">
            <option value="dejeuner">{{ i18n.t('recettes.label.category') }} - {{ i18n.t('recettes.category.dejeuner') }}</option>
            <option value="complement">{{ i18n.t('recettes.label.category') }} - {{ i18n.t('recettes.category.complement') }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">{{ i18n.t('recettes.label.instructions') }}</label>
        <textarea v-model="form.instructions" class="input" rows="3" />
      </div>
      <div>
        <label class="label">{{ i18n.t('recettes.label.ingredients') }}</label>
        <div v-for="(ing, i) in form.ingredients" :key="i" class="mb-2 flex gap-2">
          <select v-model="ing.denreeId" class="input flex-1" required>
            <option value="">— {{ i18n.t('general.select') }} —</option>
            <option v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" :value="d.id">
              {{ translateForUi(d.nom) }}
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
          + {{ i18n.t('recettes.button.new') }}
        </button>
      </div>
      <button type="submit" class="btn-primary">{{ i18n.t('recettes.button.save') }}</button>
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
            <h3 class="font-semibold text-gray-900">{{ translateForUi(r.nom) }}</h3>
            <p class="text-xs text-gray-500 capitalize">{{ i18n.t(r.categorie === 'dejeuner' ? 'recettes.category.dejeuner' : 'recettes.category.complement') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="r.valide ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ r.valide ? i18n.t('recettes.status.valid') : i18n.t('recettes.status.incomplete') }}
            </span>
            <div v-if="auth.hasRole('admin','planificateur')" class="flex gap-2">
              <button type="button" class="btn-secondary" @click="startEdit(r)">✎</button>
              <button type="button" class="btn-danger" @click="removeRecette(r.id)">🗑</button>
            </div>
          </div>
        </div>
        <p class="mb-3 text-sm text-gray-600">{{ r.instructions }}</p>
        <ul class="space-y-1 text-sm">
          <li v-for="ing in r.ingredients" :key="ing.denreeId" class="flex justify-between text-gray-700">
            <span>{{ translateForUi(getDenreeNom(ing.denreeId)) }}</span>
            <span class="text-gray-500">
              {{ formatNumber(ing.quantiteParPortion, 3) }}
              {{ stockStore.getDenree(ing.denreeId) ? UNITE_LABELS[stockStore.getDenree(ing.denreeId)!.unite] : '' }}
              / {{ i18n.t('recettes.unit.perPortion') }}
            </span>
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
