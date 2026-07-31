<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useCommandeStore } from '@/stores/commande'
import { useI18nStore } from '@/stores/i18n'
import { useStockStore } from '@/stores/stock'
import { UNITE_LABELS } from '@/types'

const commandeStore = useCommandeStore()
const stockStore = useStockStore()
const i18n = useI18nStore()
const search = ref('')
const nom = ref('')
const contact = ref('')
const produits = ref<string[]>([])

const fournisseurOptions = computed(() =>
  commandeStore.fournisseurs
    .filter((f) => f.actif)
    .filter((f) => f.nom.toLowerCase().includes(search.value.toLowerCase())),
)

function ajouterFournisseur() {
  if (!nom.value.trim() || !contact.value.trim()) return
  commandeStore.createFournisseur({
    nom: nom.value.trim(),
    contact: contact.value.trim(),
    produits: produits.value,
  })
  nom.value = ''
  contact.value = ''
  produits.value = []
}

function toggleProduit(id: string) {
  const idx = produits.value.indexOf(id)
  if (idx >= 0) produits.value.splice(idx, 1)
  else produits.value.push(id)
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('fournisseurs.title')"
      :subtitle="i18n.t('fournisseurs.subtitle')"
    />

    <div class="card mb-6 grid gap-4 lg:grid-cols-2">
      <div>
        <label class="label">{{ i18n.t('fournisseurs.name') }}</label>
        <input v-model="nom" class="input" :placeholder="i18n.t('fournisseurs.placeholder.name')" />
      </div>
      <div>
        <label class="label">{{ i18n.t('fournisseurs.contact') }}</label>
        <input v-model="contact" class="input" :placeholder="i18n.t('fournisseurs.placeholder.contact')" />
      </div>
      <div class="lg:col-span-2">
        <p class="label">{{ i18n.t('fournisseurs.products') }}</p>
        <div class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="d in stockStore.denrees.filter((x) => x.actif)"
            :key="d.id"
            type="button"
            class="rounded-lg border px-3 py-2 text-left text-sm"
            :class="produits.includes(d.id) ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-gray-200 bg-white text-gray-700'"
            @click="toggleProduit(d.id)"
          >
            {{ d.nom }} ({{ UNITE_LABELS[d.unite] }})
          </button>
        </div>
      </div>
      <div class="lg:col-span-2 flex justify-end">
        <button type="button" class="btn-primary" @click="ajouterFournisseur">
          {{ i18n.t('fournisseurs.button.add') }}
        </button>
      </div>
    </div>

    <div class="mb-4 flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold">{{ i18n.t('fournisseurs.registered') }}</h2>
      <input v-model="search" class="input max-w-xs" :placeholder="i18n.t('fournisseurs.search')" />
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('fournisseurs.table.name') }}</th>
            <th class="px-5 py-3">{{ i18n.t('fournisseurs.table.contact') }}</th>
            <th class="px-5 py-3">{{ i18n.t('fournisseurs.table.products') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in fournisseurOptions" :key="f.id" class="border-t border-gray-100">
            <td class="px-5 py-3 font-medium">{{ f.nom }}</td>
            <td class="px-5 py-3">{{ f.contact }}</td>
            <td class="px-5 py-3 text-gray-600">
              <span v-if="f.produits.length">
                {{ f.produits.map((p) => stockStore.getDenree(p)?.nom ?? p).join(', ') }}
              </span>
              <span v-else>—</span>
            </td>
          </tr>
          <tr v-if="!fournisseurOptions.length">
            <td colspan="3" class="px-5 py-6 text-center text-gray-500">{{ i18n.t('fournisseurs.noResults') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
