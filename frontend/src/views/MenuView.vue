<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { JOURS_SEMAINE, type Recette } from '@/types'
import { formatDate } from '@/utils/helpers'

const menuStore = useMenuStore()
const presenceStore = usePresenceStore()
const stockStore = useStockStore()

const semaineLabel = computed(() =>
  formatDate(menuStore.menuActuel.semaineDebut),
)

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
