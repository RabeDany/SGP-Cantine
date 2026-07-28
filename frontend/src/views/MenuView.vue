<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { JOURS_SEMAINE, type Recette } from '@/types'
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

const sortieMessage = ref('')
const sortieError = ref('')

function peutGenererSorties() {
  return sortiesPreparation.value.length > 0 && auth.currentUser !== null
}

function genererSortiesPreparation() {
  sortieError.value = ''
  sortieMessage.value = ''
  if (!auth.currentUser) {
    sortieError.value = 'Utilisateur non authentifié.'
    return
  }
  if (!sortiesPreparation.value.length) {
    sortieError.value = 'Aucune sortie à générer pour cette semaine.'
    return
  }

  const aggregates = new Map<string, number>()
  for (const sortie of sortiesPreparation.value) {
    aggregates.set(sortie.denreeId, (aggregates.get(sortie.denreeId) ?? 0) + sortie.quantite)
  }

  const insuffisances = Array.from(aggregates.entries())
    .map(([denreeId, quantite]) => {
      const denree = stockStore.getDenree(denreeId)
      if (!denree) return null
      if (quantite > denree.stockActuel) {
        return `${denree.nom} manque ${formatNumber(quantite - denree.stockActuel)} ${UNITE_LABELS[denree.unite]}`
      }
      return null
    })
    .filter(Boolean)

  if (insuffisances.length) {
    sortieError.value = `Stock insuffisant : ${insuffisances.join('; ')}`
    return
  }

  let sortiesCrees = 0
  for (const sortie of sortiesPreparation.value) {
    const result = stockStore.enregistrerSortie({
      denreeId: sortie.denreeId,
      date: sortie.jourLabel ? sortie.jourLabel : formatDate(menuStore.menuActuel.semaineDebut),
      quantite: sortie.quantite,
      motif: 'preparation_repas',
      menuId: sortie.recetteId,
      userId: auth.currentUser.id,
      commentaire: `Préparation ${sortie.jourLabel} - ${sortie.recetteNom}`,
    })
    if (result.ok) sortiesCrees += 1
    else {
      sortieError.value = result.error ?? 'Erreur lors de la création des sorties.'
      return
    }
  }
  sortieMessage.value = `Sorties de préparation générées (${sortiesCrees} mouvements).`
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
      <span
        v-if="presenceStore.pointageEffectue"
        class="rounded-lg bg-green-50 px-3 py-1.5 text-green-800"
      >
        Pointage du jour : {{ presenceStore.totalPresentsAujourdhui }} élèves
      </span>
      <span v-else class="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">
        Pointage non effectué — portions estimées utilisées
      </span>
    </div>

    <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div class="mb-2 font-semibold">Sorties de préparation proposées</div>
      <div class="grid gap-3 md:grid-cols-2">
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
      </div>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="btn-primary"
          :disabled="!peutGenererSorties()"
          @click="genererSortiesPreparation"
        >
          Générer automatiquement les sorties préparation
        </button>
        <span class="text-xs text-gray-500">Le système utilise les portions planifiées ou le pointage réel selon disponibilité.</span>
      </div>
      <p v-if="sortieError" class="mt-3 text-sm text-red-700">{{ sortieError }}</p>
      <p v-if="sortieMessage" class="mt-3 text-sm text-green-700">{{ sortieMessage }}</p>
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
