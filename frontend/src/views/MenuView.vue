<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { JOURS_SEMAINE } from '@/types'
import { formatDate } from '@/utils/helpers'

const menuStore = useMenuStore()
const presenceStore = usePresenceStore()

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
            @change="updateJour(jour.jour, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">— Aucune —</option>
            <option
              v-for="r in menuStore.recettesActives.filter((x) => x.valide)"
              :key="r.id"
              :value="r.id"
            >
              {{ r.nom }}
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
