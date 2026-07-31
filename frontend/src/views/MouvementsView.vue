<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { useMenuStore } from '@/stores/menu'
import { useStockStore } from '@/stores/stock'
import {
  JOURS_SEMAINE,
  MOTIF_LABELS,
  PROVENANCE_LABELS,
  UNITE_LABELS,
  type MotifSortie,
  type ProvenanceStock,
} from '@/types'
import { formatDate, formatNumber, todayISO } from '@/utils/helpers'

const auth = useAuthStore()
const stockStore = useStockStore()
const menuStore = useMenuStore()
const i18n = useI18nStore()

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
  menuId: '',
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
    menuId: sortieForm.value.menuId || undefined,
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
  sortieForm.value.menuId = ''
}

function getDenreeNom(id: string) {
  return stockStore.getDenree(id)?.nom ?? id
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('mouvements.title')"
      :subtitle="i18n.t('mouvements.subtitle')"
    />

    <div class="mb-4 flex gap-2">
      <button
        v-for="t in [
          { id: 'entree', label: i18n.t('mouvements.tab.entree') },
          { id: 'sortie', label: i18n.t('mouvements.tab.sortie') },
          { id: 'historique', label: i18n.t('mouvements.tab.historique') },
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
        <label class="label">{{ i18n.t('mouvements.label.entry') }}</label>
        <select v-model="entreeForm.denreeId" class="input" required>
          <option value="">— {{ i18n.t('general.select') }} —</option>
          <option v-for="d in stockStore.denrees.filter((x) => x.actif)" :key="d.id" :value="d.id">
            {{ d.nom }} ({{ formatNumber(d.stockActuel) }} {{ UNITE_LABELS[d.unite] }})
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('general.date') }}</label>
        <input v-model="entreeForm.date" type="date" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('general.quantity') }}</label>
        <input v-model.number="entreeForm.quantite" type="number" min="0.01" step="0.01" class="input" required />
      </div>
      <div>
        <label class="label">{{ i18n.t('mouvements.label.origin') }}</label>
        <select v-model="entreeForm.provenance" class="input">
          <option v-for="(label, key) in PROVENANCE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('mouvements.label.purchasePrice') }}</label>
        <input v-model.number="entreeForm.prixAchat" type="number" min="0" class="input" />
      </div>
      <div>
        <label class="label">{{ i18n.t('mouvements.label.receiptNumber') }}</label>
        <input v-model="entreeForm.numeroBon" class="input" :placeholder="i18n.t('mouvements.placeholder.receipt')" />
      </div>
      <div>
        <label class="label">{{ i18n.t('mouvements.label.expirationDate') }}</label>
        <input v-model="entreeForm.datePeremption" type="date" class="input" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">{{ i18n.t('mouvements.button.submitEntry') }}</button>
      </div>
    </form>

    <form v-if="tab === 'sortie'" class="card mb-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submitSortie">
      <div class="sm:col-span-2">
        <label class="label">{{ i18n.t('mouvements.label.exit') }}</label>
        <select v-model="sortieForm.denreeId" class="input" required>
          <option value="">— {{ i18n.t('general.select') }} —</option>
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
        <label class="label">{{ i18n.t('mouvements.label.reason') }}</label>
        <select v-model="sortieForm.motif" class="input">
          <option v-for="(label, key) in MOTIF_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('mouvements.label.menuRecipe') }}</label>
        <select v-model="sortieForm.menuId" class="input">
          <option value="">— Aucun lien —</option>
          <option
            v-for="jour in menuStore.menuActuel.jours"
            :key="jour.jour"
            :value="jour.recetteId || ''"
            :disabled="!jour.recetteId"
          >
            {{ JOURS_SEMAINE[jour.jour] }} — {{ menuStore.getRecette(jour.recetteId ?? '')?.nom ?? 'Aucune recette' }}
          </option>
        </select>
      </div>
      <div class="sm:col-span-2">
        <label class="label">{{ i18n.t('general.comment') }} {{ sortieForm.motif === 'avarie' ? `(${i18n.t('mouvements.label.required')})` : '' }}</label>
        <textarea v-model="sortieForm.commentaire" class="input" rows="2" />
      </div>
      <div class="sm:col-span-2">
        <button type="submit" class="btn-primary">{{ i18n.t('mouvements.button.submitExit') }}</button>
      </div>
    </form>

    <div v-if="tab === 'historique'" class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('general.date') }}</th>
            <th class="px-5 py-3">{{ i18n.t('mouvements.table.type') }}</th>
            <th class="px-5 py-3">{{ i18n.t('fournisseurs.table.name') }}</th>
            <th class="px-5 py-3">{{ i18n.t('general.quantity') }}</th>
            <th class="px-5 py-3">{{ i18n.t('general.comment') }}</th>
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
                {{ m.type === 'entree' ? i18n.t('mouvements.status.entry') : i18n.t('mouvements.status.exit') }}
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
                <template v-if="m.menuId">
                  · {{ i18n.t('mouvements.detail.linkedRecipe') }} : {{ menuStore.getRecette(m.menuId)?.nom ?? m.menuId }}
                </template>
                {{ m.commentaire ? `· ${m.commentaire}` : '' }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
