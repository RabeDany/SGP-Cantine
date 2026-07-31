<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import {
  CATEGORIE_LABELS,
  UNITE_LABELS,
  type DenreeCategorie,
  type UniteMesure,
} from '@/types'
import { formatNumber, todayISO } from '@/utils/helpers'

const stockStore = useStockStore()
const i18n = useI18nStore()
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
  success.value = i18n.t('denrees.success.created', { name: form.value.nom })
  resetForm()
  showForm.value = false
  setTimeout(() => (success.value = ''), 3000)
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('denrees.title')"
      :subtitle="i18n.t('denrees.subtitle')"
    />

    <div class="mb-4 flex items-center justify-between">
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>
      <div v-else />
      <button type="button" class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? i18n.t('general.cancel') : i18n.t('denrees.button.new') }}
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div class="sm:col-span-2">
        <label class="label">{{ i18n.t('denrees.label.name') }}</label>
        <input v-model="form.nom" class="input" required :placeholder="i18n.t('denrees.placeholder.example')" />
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.category') }}</label>
        <select v-model="form.categorie" class="input">
          <option v-for="(label, key) in CATEGORIE_LABELS" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.unit') }}</label>
        <select v-model="form.unite" class="input">
          <option v-for="(label, key) in UNITE_LABELS" :key="key" :value="key">
            {{ i18n.t('general.unit.' + key) }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.alertThreshold') }}</label>
        <input v-model.number="form.seuilAlerte" type="number" min="0" step="0.1" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.shelfLife') }}</label>
        <input v-model.number="form.dureeConservationJours" type="number" min="1" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.expirationDate') }}</label>
        <input v-model="form.datePeremption" type="date" class="input" :min="todayISO()" />
      </div>
      <div>
        <label class="label">{{ i18n.t('denrees.label.initialStock') }}</label>
        <input v-model.number="form.stockInitial" type="number" min="0" step="0.1" class="input" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">{{ i18n.t('denrees.form.submit') }}</button>
      </div>
    </form>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('denrees.table.name') }}</th>
            <th class="px-5 py-3">{{ i18n.t('denrees.table.category') }}</th>
            <th class="px-5 py-3">{{ i18n.t('denrees.table.unit') }}</th>
            <th class="px-5 py-3">{{ i18n.t('denrees.table.threshold') }}</th>
            <th class="px-5 py-3">{{ i18n.t('denrees.table.stock') }}</th>
            <th class="px-5 py-3">{{ i18n.t('denrees.table.shelfLife') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" class="border-t">
            <td class="px-5 py-3 font-medium">{{ d.nom }}</td>
            <td class="px-5 py-3">{{ CATEGORIE_LABELS[d.categorie] }}</td>
            <td class="px-5 py-3">{{ i18n.t('general.unit.' + d.unite) }}</td>
            <td class="px-5 py-3">{{ formatNumber(d.seuilAlerte) }}</td>
            <td class="px-5 py-3">{{ formatNumber(d.stockActuel) }}</td>
            <td class="px-5 py-3 text-gray-500">{{ d.dureeConservationJours }} {{ i18n.t('denrees.label.daysShort') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
