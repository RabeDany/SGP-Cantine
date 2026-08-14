<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMenuStore } from '@/stores/menu'
import { useNutritionStore } from '@/stores/nutrition'
import { useI18nStore } from '@/stores/i18n'
import { NUTRIMENTS_LABELS } from '@/knowledge base/nutrition-knowledge-base'

const menuStore = useMenuStore()
const nutritionStore = useNutritionStore()
const i18n = useI18nStore()
const suggestionDecision = ref<Record<string, 'accepted' | 'ignored'>>({})

const isMenuValide = computed(() => menuStore.menuActuel?.valide ?? false)
const isMenuComplet = computed(() => nutritionStore.valideNutritionnellement)
const optimisation = computed(() => nutritionStore.optimisationMenu)
const recommandations = computed(() => nutritionStore.nutrimentsInsuffisants)
const suggestions = computed(() => nutritionStore.suggestionsNutrition)
const objectifsOms = computed(() => {
  const maxValue = Math.max(...nutritionStore.bilanMenu.couverture.map((item) => item.seuil), 1)
  return nutritionStore.bilanMenu.couverture.map((item) => ({
    ...item,
    target: item.seuil,
    ratio: Math.min((item.apporte / item.seuil) * 100, 100),
    normalized: maxValue > 0 ? (item.apporte / maxValue) * 100 : 0,
  }))
})

function statusClass(statut: 'ok' | 'insuffisant') {
  return statut === 'ok' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
}

function suggestionKey(suggestion: { nutriment: string; type: string; denreeId?: string; recetteId?: string }) {
  return `${suggestion.nutriment}-${suggestion.type}-${suggestion.denreeId ?? suggestion.recetteId ?? 'none'}`
}

function acceptSuggestion(suggestion: { nutriment: string; type: string; denreeId?: string; recetteId?: string }) {
  suggestionDecision.value[suggestionKey(suggestion)] = 'accepted'
}

function ignoreSuggestion(suggestion: { nutriment: string; type: string; denreeId?: string; recetteId?: string }) {
  suggestionDecision.value[suggestionKey(suggestion)] = 'ignored'
}
</script>

<template>
  <div class="min-h-screen bg-earth-50">
    <PageHeader
      :title="i18n.t('dashboard.cards.nutrition')"
      :subtitle="i18n.t('dashboard.charts.nutritionSub')"
    />

    <div v-if="!isMenuValide" class="card p-6 text-sm text-gray-600">
      Le menu n’est pas encore validé. Une fois le planning validé, le bilan nutritionnel sera calculé automatiquement.
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div class="card p-6">
          <p class="text-sm text-gray-500">Score global</p>
          <div class="mt-3 text-3xl font-bold" :class="isMenuComplet ? 'text-green-600' : 'text-red-600'">
            {{ nutritionStore.valideNutritionnellement ? '100%' : `${nutritionStore.bilanMenu.scoreGlobal}%` }}
          </div>
          <p class="mt-2 text-xs text-gray-500">Couverture moyenne des 6 nutriments</p>
        </div>

        <div class="card p-6">
          <p class="text-sm text-gray-500">Optimisation US-35</p>
          <div class="mt-3 text-3xl font-bold" :class="optimisation.respecteSeuils ? 'text-green-600' : 'text-amber-600'">
            {{ optimisation.scoreTotal }}
          </div>
          <p class="mt-2 text-xs text-gray-500">Score multicritères nutrition / budget / stock / gaspillage</p>
        </div>

        <div class="card p-6">
          <p class="text-sm text-gray-500">Calories</p>
          <p class="mt-3 text-2xl font-bold text-gray-900">{{ nutritionStore.bilanMenu.totalParNutriment.calories.toFixed(0) }}</p>
          <p class="mt-2 text-xs text-gray-500">kcal / repas</p>
        </div>

        <div class="card p-6">
          <p class="text-sm text-gray-500">Protéines</p>
          <p class="mt-3 text-2xl font-bold text-gray-900">{{ nutritionStore.bilanMenu.totalParNutriment.proteines.toFixed(1) }}</p>
          <p class="mt-2 text-xs text-gray-500">g / repas</p>
        </div>

        <div class="card p-6">
          <p class="text-sm text-gray-500">Portions estimées</p>
          <p class="mt-3 text-2xl font-bold text-gray-900">{{ nutritionStore.bilanMenu.portionsTotal.toFixed(0) }}</p>
          <p class="mt-2 text-xs text-gray-500">Total sur la semaine</p>
        </div>
      </div>

      <div v-if="optimisation.blocage" class="card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {{ optimisation.blocage }}
      </div>

      <div class="card p-6">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Graphique de couverture</h3>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            OMS 6–12 ans
          </span>
        </div>

        <div class="flex h-48 items-end gap-3 overflow-x-auto pb-2">
          <div v-for="item in objectifsOms" :key="item.nutriment" class="flex min-w-[52px] flex-1 flex-col items-center justify-end">
            <div class="flex h-36 w-full items-end justify-center">
              <div
                class="w-full rounded-t-xl border border-white/60 shadow-sm transition-all duration-300"
                :class="item.statut === 'ok' ? 'bg-gradient-to-t from-green-500 to-emerald-400' : 'bg-gradient-to-t from-amber-400 to-red-500'"
                :style="{ height: `${Math.max(item.ratio, 8)}%` }"
                :title="`${NUTRIMENTS_LABELS[item.nutriment]} : ${item.pourcentage}%`"
              />
            </div>
            <span class="mt-2 text-center text-[10px] font-medium text-gray-600">
              {{ NUTRIMENTS_LABELS[item.nutriment].split('(')[0].trim() }}
            </span>
            <span class="text-[10px] text-gray-500">{{ item.pourcentage }}%</span>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">Couverture nutritionnelle</h3>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            OMS 6–12 ans
          </span>
        </div>

        <div class="space-y-4">
          <div v-for="item in objectifsOms" :key="item.nutriment" class="space-y-2">
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-medium text-gray-700">{{ NUTRIMENTS_LABELS[item.nutriment] }}</span>
              <span class="text-xs font-semibold" :class="item.statut === 'ok' ? 'text-green-600' : 'text-red-600'">
                {{ item.pourcentage }}%
              </span>
            </div>

            <div class="flex items-center gap-3">
              <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="item.statut === 'ok' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-red-500'"
                  :style="{ width: `${Math.min(item.ratio, 100)}%` }"
                  :title="`${item.apporte.toFixed(1)} / ${item.seuil.toFixed(1)} (${item.pourcentage}%)`"
                />
              </div>
              <span class="min-w-20 text-right text-[11px] text-gray-500">
                {{ item.apporte.toFixed(1) }} / {{ item.seuil.toFixed(1) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="suggestions.length" class="card p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-900">Suggestions d’amélioration</h3>
        <ul class="space-y-3">
          <li
            v-for="suggestion in suggestions"
            :key="suggestionKey(suggestion)"
            class="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-amber-800">{{ NUTRIMENTS_LABELS[suggestion.nutriment] }}</p>
                <p class="text-sm text-amber-700">{{ suggestion.titre }}</p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {{ suggestion.type === 'ingredient' ? 'Ingrédient' : 'Recette' }}
              </span>
            </div>

            <p class="mt-2 text-sm text-amber-800">{{ suggestion.detail }}</p>
            <div class="mt-3 flex items-center justify-between text-xs text-amber-700">
              <span>Gain estimé : +{{ suggestion.impactEstime.toFixed(1) }}</span>
              <span>{{ suggestion.gainPourcentage.toFixed(0) }}% du besoin</span>
            </div>

            <div v-if="!suggestionDecision[suggestionKey(suggestion)]" class="mt-4 flex gap-2">
              <button
                type="button"
                class="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                @click="acceptSuggestion(suggestion)"
              >
                Accepter
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                @click="ignoreSuggestion(suggestion)"
              >
                Ignorer
              </button>
            </div>

            <div v-else class="mt-4 text-xs font-medium" :class="suggestionDecision[suggestionKey(suggestion)] === 'accepted' ? 'text-green-700' : 'text-slate-600'">
              {{ suggestionDecision[suggestionKey(suggestion)] === 'accepted' ? 'Suggestion acceptée' : 'Suggestion ignorée' }}
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="recommandations.length" class="card p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-900">Points à améliorer</h3>
        <ul class="space-y-3">
          <li
            v-for="nutriment in recommandations"
            :key="nutriment.nutriment"
            class="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-3"
          >
            <div>
              <p class="font-medium text-red-700">{{ NUTRIMENTS_LABELS[nutriment.nutriment] }}</p>
              <p class="text-sm text-red-600">
                {{ nutriment.apporte.toFixed(1) }} / {{ nutriment.seuil.toFixed(1) }} — {{ nutriment.pourcentage }}%
              </p>
            </div>
            <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="statusClass(nutriment.statut)">
              {{ nutriment.statut === 'ok' ? 'OK' : 'À renforcer' }}
            </span>
          </li>
        </ul>
      </div>

      <div v-else class="card p-6">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-3 w-3 rounded-full bg-green-500" />
          <p class="text-sm font-medium text-green-700">Le menu couvre correctement les besoins nutritionnels recommandés.</p>
        </div>
      </div>
    </div>
  </div>
</template>
