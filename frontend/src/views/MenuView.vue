<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { JOURS_SEMAINE, type MenuHebdo, type Recette } from '@/types'
import { formatDate, formatNumber } from '@/utils/helpers'

const auth = useAuthStore()
const menuStore = useMenuStore()
const presenceStore = usePresenceStore()
const stockStore = useStockStore()

const semaineLabel = computed(() =>
  formatDate(menuStore.menuActuel.semaineDebut),
)

const sortiesPreparation = computed(() => menuStore.sortiesPreparation)
const sortiesParDenree = computed(() => {
  const totals = new Map<string, { nom: string; unite: string; quantite: number; disponible: number }>()
  for (const sortie of sortiesPreparation.value) {
    const denree = stockStore.getDenree(sortie.denreeId)
    const current = totals.get(sortie.denreeId)
    const nextQuantite = (current?.quantite ?? 0) + sortie.quantite
    totals.set(sortie.denreeId, {
      nom: denree?.nom ?? sortie.denreeId,
      unite: denree?.unite ?? 'unite',
      quantite: nextQuantite,
      disponible: denree?.stockActuel ?? 0,
    })
  }
  return Array.from(totals.entries()).map(([denreeId, item]) => ({ denreeId, ...item }))
})

const validationMessage = ref('')
const validationError = ref('')

const menuDejaValide = computed(() => menuStore.menuActuel.valide)

function peutValiderMenu() {
  if (menuDejaValide.value) return false
  if (!sortiesPreparation.value.length || !auth.currentUser) return false

  const totals = new Map<string, number>()
  for (const sortie of sortiesPreparation.value) {
    totals.set(sortie.denreeId, (totals.get(sortie.denreeId) ?? 0) + sortie.quantite)
  }

  return Array.from(totals.entries()).every(([denreeId, quantite]) => {
    const denree = stockStore.getDenree(denreeId)
    return denree ? quantite <= denree.stockActuel : false
  })
}

function validerMenu() {
  validationError.value = ''
  validationMessage.value = ''
  if (!auth.currentUser) {
    validationError.value = 'Utilisateur non authentifié.'
    return
  }

  const result = menuStore.validerMenu(auth.currentUser.id)
  if (!result.ok) {
    validationError.value = result.error ?? 'Échec de la validation du menu.'
    return
  }

  validationMessage.value = 'Menu validé et stock mis à jour.'
}

function reouvrirMenu() {
  validationError.value = ''
  validationMessage.value = ''
  const result = menuStore.invaliderMenu(auth.currentUser?.id ?? 'system')
  if (!result.ok) {
    validationError.value = result.error ?? 'Échec de l’annulation de la validation.'
    return
  }

  validationMessage.value = 'Validation annulée et stock restauré.'
}

function changerMenu(menuId: string) {
  menuStore.setMenuActuel(menuId)
}

function formatMenuLabel(menu: MenuHebdo) {
  const status = menu.valide ? 'Validé' : 'En cours'
  return `${formatDate(menu.semaineDebut)} — ${status}`
}

function updateJour(jour: number, recetteId: string) {
  const j = menuStore.menuActuel.jours.find((x) => x.jour === jour)!
  menuStore.updateMenuJour(jour, recetteId || null, j.portionsPrevues)
}

function updatePortions(jour: number, portions: number) {
  const j = menuStore.menuActuel.jours.find((x) => x.jour === jour)!
  menuStore.updateMenuJour(jour, j.recetteId, portions)
}

function getRecetteNom(id: string | null) {
  if (!id) return '—'
  return menuStore.getRecette(id)?.nom ?? '—'
}

const denreesPrioritaires = computed(() =>
  stockStore.denreesAvecStatut.filter((d) => d.joursAvantPeremption !== null && d.joursAvantPeremption <= 7),
)

const denreesManquantes = computed(() => menuStore.denreesManquantes)

const stockSuffisantPourValidation = computed(() =>
  !denreesManquantes.value.length && sortiesPreparation.value.length > 0,
)

function utiliseDenreePrioritaire(recette: Recette) {
  return recette.ingredients.some((ing) =>
    denreesPrioritaires.value.some((d) => d.id === ing.denreeId),
  )
}

const recettesDisponibles = computed(() => {
  const list = menuStore.recettesActives.filter((x) => x.valide)
  return [...list].sort((a, b) => {
    const pa = utiliseDenreePrioritaire(a) ? 1 : 0
    const pb = utiliseDenreePrioritaire(b) ? 1 : 0
    return pb - pa
  })
})
</script>

<template>
  <div>
    <PageHeader
      title="Menu hebdomadaire"
      subtitle="Planification recette × jour avec calcul automatique des besoins (US-07)"
    />

    <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
      <span class="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-800">
        Semaine du {{ semaineLabel }}
      </span>
      <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span class="text-xs uppercase tracking-wide text-slate-500">Menu</span>
        <select class="bg-transparent text-sm outline-none" :value="menuStore.menuActuel.id" @change="changerMenu(($event.target as HTMLSelectElement).value)">
          <option v-for="menu in menuStore.menusDisponibles" :key="menu.id" :value="menu.id">
            {{ formatMenuLabel(menu) }}
          </option>
        </select>
      </label>
      <span
        v-if="presenceStore.pointageEffectue"
        class="rounded-lg bg-green-50 px-3 py-1.5 text-green-800 "
      >
        <span class="font-bold">Pointage du jour : </span> {{ presenceStore.totalPresentsAujourdhui }} élèves
      </span>
      <span v-else class="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">
        Pointage non effectué — portions estimées utilisées
      </span>
    </div>

    <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div class="mb-2 font-semibold">Sorties de préparation proposées</div>
        <div class="grid gap-3 md:grid-cols-3">
          <div>
            <p class="text-xs text-gray-500">Articles</p>
            <p class="text-lg font-bold">{{ sortiesParDenree.length }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Quantité totale</p>
            <p class="text-lg font-bold">
              {{ formatNumber(sortiesParDenree.reduce((sum, item) => sum + item.quantite, 0)) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500">Statut stock</p>
            <p class="text-lg font-bold">
              {{ stockSuffisantPourValidation ? 'OK' : 'Manquants' }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            v-if="!menuDejaValide"
            type="button"
            class="btn-primary"
            :disabled="!peutValiderMenu()"
            @click="validerMenu"
          >
            Valider le menu
          </button>
          <span class="text-xs text-gray-500">
            Ce bouton est actif seulement si toutes les denrées nécessaires sont en stock et si le menu n'a pas déjà été validé.
          </span>
        </div>

        <p v-if="menuDejaValide" class="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Menu validé le {{ menuStore.menuActuel.dateValidation }} par {{ auth.currentUser?.nom }}.
        </p>

        <div v-if="denreesManquantes.length" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <div class="font-semibold">Stock insuffisant</div>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li v-for="item in denreesManquantes" :key="item.denreeId">
              {{ item.denree?.nom ?? item.denreeId }} : besoin {{ formatNumber(item.quantiteNecessaire) }} {{ item.denree?.unite ?? 'unités' }}, disponible {{ formatNumber(item.stockDisponible) }}
            </li>
          </ul>
        </div>

        <p v-if="validationError" class="mt-3 text-sm text-red-700">{{ validationError }}</p>
        <p v-if="validationMessage" class="mt-3 text-sm text-green-700">{{ validationMessage }}</p>
      </div>

      <div v-if="denreesPrioritaires.length" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p class="font-semibold">Priorité péremption</p>
      <p class="mt-1">
        Les denrées suivantes sont proches de la péremption :
        <span class="font-medium">
          {{ denreesPrioritaires.map((d) => d.nom).join(', ') }}
        </span>
        . Elles sont mises en avant dans la planification du menu.
      </p>
    </div>

    <div class="grid gap-4">
      <div
        v-for="jour in menuStore.menuActuel.jours"
        :key="jour.jour"
        class="card flex flex-wrap items-center gap-4"
      >
        <div class="w-28">
          <p class="font-semibold text-gray-900">{{ JOURS_SEMAINE[jour.jour] }}</p>
        </div>
        <div class="min-w-[200px] flex-1">
          <label class="label text-xs">Recette</label>
          <select
            class="input"
            :value="jour.recetteId ?? ''"
            :disabled="!presenceStore.pointageEffectue"
            @change="updateJour(jour.jour, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Aucune —</option>
            <option
              v-for="r in recettesDisponibles"
              :key="r.id"
              :value="r.id"
            >
              {{ r.nom }}{{ utiliseDenreePrioritaire(r) ? ' ⚠️' : '' }}
            </option>
          </select>
        </div>
        <div class="w-36">
          <label class="label text-xs">Portions prévues</label>
          <input
            type="number"
            min="1"
            class="input"
            :value="jour.portionsPrevues"
            :disabled="!presenceStore.pointageEffectue"
            @change="
              updatePortions(jour.jour, Number(($event.target as HTMLInputElement).value))
            "
          />
        </div>
        <div class="text-sm text-gray-500">
          {{ getRecetteNom(jour.recetteId) }}
        </div>
      </div>
    </div>

    <p class="mt-4 text-sm text-gray-500">
      La liste de courses est recalculée automatiquement à partir de ce menu et des présences
      enregistrées.
    </p>
  </div>
</template>
