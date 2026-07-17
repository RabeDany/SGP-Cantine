<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { UNITE_LABELS } from '@/types'
import { formatNumber } from '@/utils/helpers'

const menuStore = useMenuStore()
const presenceStore = usePresenceStore()

const portionsUtilisees = computed(() =>
  presenceStore.pointageEffectue
    ? presenceStore.totalPresentsAujourdhui
    : menuStore.menuActuel.jours[0]?.portionsPrevues ?? 0,
)

const totalManquants = computed(() =>
  menuStore.denreesManquantes.reduce((s, b) => s + b.manquant, 0),
)
</script>

<template>
  <div>
    <PageHeader
      title="Liste de courses"
      subtitle="Besoins calculés depuis le menu et les présences — manquants en rouge (US-08)"
    />

    <div class="mb-6 grid gap-4 sm:grid-cols-3">
      <div class="card">
        <p class="text-xs text-gray-500">Portions de référence</p>
        <p class="text-2xl font-bold">{{ portionsUtilisees }}</p>
        <p class="text-xs text-gray-400">
          {{ presenceStore.pointageEffectue ? 'Basé sur pointage' : 'Basé sur portions prévues' }}
        </p>
      </div>
      <div class="card">
        <p class="text-xs text-gray-500">Denrées nécessaires</p>
        <p class="text-2xl font-bold">{{ menuStore.listeCourses.length }}</p>
      </div>
      <div class="card" :class="totalManquants > 0 ? 'border-red-200 bg-red-50' : ''">
        <p class="text-xs text-gray-500">Denrées manquantes</p>
        <p class="text-2xl font-bold" :class="menuStore.denreesManquantes.length ? 'text-red-700' : ''">
          {{ menuStore.denreesManquantes.length }}
        </p>
      </div>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Denrée</th>
            <th class="px-5 py-3">Besoin semaine</th>
            <th class="px-5 py-3">Stock dispo</th>
            <th class="px-5 py-3">Manquant</th>
            <th class="px-5 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="b in menuStore.listeCourses"
            :key="b.denreeId"
            class="border-t"
            :class="b.manque ? 'bg-red-50' : ''"
          >
            <td class="px-5 py-3 font-medium" :class="b.manque ? 'text-red-900' : ''">
              {{ b.denree?.nom }}
            </td>
            <td class="px-5 py-3">
              {{ formatNumber(b.quantiteNecessaire) }}
              {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
            </td>
            <td class="px-5 py-3">
              {{ formatNumber(b.stockDisponible) }}
              {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
            </td>
            <td class="px-5 py-3 font-semibold" :class="b.manque ? 'text-red-700' : 'text-gray-400'">
              <template v-if="b.manque">
                {{ formatNumber(b.manquant) }} {{ b.denree ? UNITE_LABELS[b.denree.unite] : '' }}
              </template>
              <template v-else>—</template>
            </td>
            <td class="px-5 py-3">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="b.manque ? 'bg-red-200 text-red-900' : 'bg-green-100 text-green-800'"
              >
                {{ b.manque ? 'À commander' : 'Suffisant' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!menuStore.listeCourses.length" class="p-8 text-center text-gray-500">
        Aucun besoin calculé — composez d'abord le menu hebdomadaire.
      </p>
    </div>
  </div>
</template>
