<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'
import { usePresenceStore } from '@/stores/presence'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import { JOURS_SEMAINE, type MenuHebdo, type Recette } from '@/types'
import type { OptimisationResultat } from '@/types/optimisation'
import { formatDate, formatNumber } from '@/utils/helpers'
import { translateForUi } from '@/utils/foodTranslator'

const auth = useAuthStore()
const menuStore = useMenuStore()
const presenceStore = usePresenceStore()
const stockStore = useStockStore()
const i18n = useI18nStore()

const semaineLabel = computed(() => formatDate(menuStore.menuActuel.semaineDebut))

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

/** US-41 — optimisation génétique */
const optimising = ref(false)
const proposition = ref<OptimisationResultat | null>(null)
const joursVerrouilles = ref<number[]>([])
const optimMessage = ref('')
const optimError = ref('')

const canOptimise = computed(
  () => ['admin', 'planificateur'].includes(auth.currentUser?.role ?? '') && !menuDejaValide.value,
)

function toggleVerrou(jour: number) {
  if (joursVerrouilles.value.includes(jour)) {
    joursVerrouilles.value = joursVerrouilles.value.filter((j) => j !== jour)
  } else {
    joursVerrouilles.value = [...joursVerrouilles.value, jour]
  }
}

function genererMenuOptimise() {
  optimError.value = ''
  optimMessage.value = ''
  proposition.value = null
  optimising.value = true

  window.setTimeout(() => {
    try {
      const recettesVerrouillees: Record<number, string> = {}
      for (const jour of joursVerrouilles.value) {
        const id = menuStore.menuActuel.jours.find((j) => j.jour === jour)?.recetteId
        if (id) recettesVerrouillees[jour] = id
      }

      const result = menuStore.optimiserMenu({
        populationSize: 50,
        generations: 60,
        joursVerrouilles: [...joursVerrouilles.value],
        recettesVerrouillees,
      })
      proposition.value = result
      optimMessage.value = i18n.t('menu.optim.done')
    } catch (e) {
      optimError.value = e instanceof Error ? e.message : i18n.t('menu.optim.error')
    } finally {
      optimising.value = false
    }
  }, 30)
}

function appliquerProposition() {
  if (!proposition.value || !auth.currentUser) return
  const result = menuStore.appliquerPlanningOptimise(proposition.value.meilleur.recetteIds, {
    id: auth.currentUser.id,
    nom: auth.currentUser.nom,
    role: auth.currentUser.role,
  })
  if (!result.ok) {
    optimError.value = result.error ?? i18n.t('menu.optim.applyError')
    return
  }
  optimMessage.value = i18n.t('menu.optim.applied')
  proposition.value = null
}

function rejeterProposition() {
  proposition.value = null
  optimMessage.value = i18n.t('menu.optim.rejected')
}

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

  const result = menuStore.validerMenu(auth.currentUser.id, {
    id: auth.currentUser.id,
    nom: auth.currentUser.nom,
    role: auth.currentUser.role,
  })
  if (!result.ok) {
    validationError.value = result.error ?? 'Échec de la validation du menu.'
    return
  }

  validationMessage.value = 'Menu validé et stock mis à jour.'
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
  menuStore.updateMenuJour(
    jour,
    recetteId || null,
    j.portionsPrevues,
    auth.currentUser
      ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role }
      : undefined,
  )
}

function updatePortions(jour: number, portions: number) {
  const j = menuStore.menuActuel.jours.find((x) => x.jour === jour)!
  menuStore.updateMenuJour(jour, j.recetteId, portions)
}

function getRecetteNom(id: string | null) {
  if (!id) return '—'
  return translateForUi(menuStore.getRecette(id)?.nom ?? '—')
}

const denreesPrioritaires = computed(() =>
  stockStore.denreesAvecStatut.filter(
    (d) => d.joursAvantPeremption !== null && d.joursAvantPeremption <= 7,
  ),
)

const denreesManquantes = computed(() => menuStore.denreesManquantes)

const stockSuffisantPourValidation = computed(
  () => !denreesManquantes.value.length && sortiesPreparation.value.length > 0,
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
    <PageHeader :title="i18n.t('menu.title')" :subtitle="i18n.t('menu.subtitle')" />

    <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
      <span class="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-800">
        {{ i18n.t('menu.weekLabel', { week: semaineLabel }) }}
      </span>
      <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span class="text-xs uppercase tracking-wide text-slate-500">{{ i18n.t('menu.label.menu') }}</span>
        <select
          class="bg-transparent text-sm outline-none"
          :value="menuStore.menuActuel.id"
          @change="changerMenu(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="menu in menuStore.menusDisponibles" :key="menu.id" :value="menu.id">
            {{ formatMenuLabel(menu) }}
          </option>
        </select>
      </label>
      <span
        v-if="presenceStore.pointageEffectue"
        class="rounded-lg bg-green-50 px-3 py-1.5 text-green-800"
      >
        <span class="font-bold">{{ i18n.t('menu.attendance.today') }}</span>
        {{ presenceStore.totalPresentsAujourdhui }} {{ i18n.t('menu.attendance.students') }}
      </span>
      <span v-else class="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">
        {{ i18n.t('menu.attendance.missing') }}
      </span>
    </div>

    <!-- Proposition de menu automatique -->
    <section v-if="canOptimise" class="card mb-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">{{ i18n.t('menu.optim.title') }}</h3>
          <p class="mt-1 text-sm text-gray-500">{{ i18n.t('menu.optim.help') }}</p>
        </div>
        <button
          type="button"
          class="btn-primary"
          :disabled="optimising"
          @click="genererMenuOptimise"
        >
          {{ optimising ? i18n.t('menu.optim.loading') : i18n.t('menu.optim.generate') }}
        </button>
      </div>

      <p class="text-xs text-gray-500">{{ i18n.t('menu.optim.lockHint') }}</p>

      <div
        v-if="proposition"
        class="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4"
      >
        <p class="text-sm font-medium text-emerald-900">{{ i18n.t('menu.optim.proposalTitle') }}</p>
        <ul class="grid gap-2 text-sm sm:grid-cols-5">
          <li
            v-for="(recetteId, idx) in proposition.meilleur.recetteIds"
            :key="idx"
            class="rounded-lg border border-white bg-white px-3 py-3"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ JOURS_SEMAINE[idx] }}
            </p>
            <p class="mt-1 font-medium text-gray-900">{{ getRecetteNom(recetteId) }}</p>
          </li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" @click="appliquerProposition">
            {{ i18n.t('menu.optim.apply') }}
          </button>
          <button type="button" class="btn-secondary" @click="rejeterProposition">
            {{ i18n.t('menu.optim.reject') }}
          </button>
        </div>
      </div>

      <p v-if="optimError" class="text-sm text-red-700">{{ optimError }}</p>
      <p v-if="optimMessage && !proposition" class="text-sm text-emerald-800">{{ optimMessage }}</p>
    </section>

    <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div class="mb-2 font-semibold">{{ i18n.t('menu.prep.title') }}</div>
      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <p class="text-xs text-gray-500">{{ i18n.t('menu.prep.items') }}</p>
          <p class="text-lg font-bold">{{ sortiesParDenree.length }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">{{ i18n.t('menu.prep.total') }}</p>
          <p class="text-lg font-bold">
            {{ formatNumber(sortiesParDenree.reduce((sum, item) => sum + item.quantite, 0)) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500">{{ i18n.t('menu.prep.stockStatus') }}</p>
          <p class="text-lg font-bold">
            {{ stockSuffisantPourValidation ? i18n.t('menu.prep.ok') : i18n.t('menu.prep.missing') }}
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
          {{ i18n.t('menu.button.validate') }}
        </button>
        <span class="text-xs text-gray-500">{{ i18n.t('menu.validate.help') }}</span>
      </div>

      <p v-if="menuDejaValide" class="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
        {{
          i18n.t('menu.validated', {
            date: menuStore.menuActuel.dateValidation,
            user: auth.currentUser?.nom ?? '',
          })
        }}
      </p>

      <div
        v-if="denreesManquantes.length"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      >
        <div class="font-semibold">{{ i18n.t('menu.stockInsufficient.title') }}</div>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="item in denreesManquantes" :key="item.denreeId">
            {{ translateForUi(item.denree?.nom ?? item.denreeId) }} :
            {{ i18n.t('menu.stockInsufficient.need') }}
            {{ formatNumber(item.quantiteNecessaire) }}
            {{ item.denree?.unite ?? i18n.t('menu.stockInsufficient.units') }},
            {{ i18n.t('menu.stockInsufficient.available') }}
            {{ formatNumber(item.stockDisponible) }}
          </li>
        </ul>
      </div>

      <p v-if="validationError" class="mt-3 text-sm text-red-700">{{ validationError }}</p>
      <p v-if="validationMessage" class="mt-3 text-sm text-green-700">{{ validationMessage }}</p>
    </div>

    <div
      v-if="denreesPrioritaires.length"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p class="font-semibold">{{ i18n.t('menu.priority.title') }}</p>
      <p class="mt-1">
        {{ i18n.t('menu.priority.description') }}
        <span class="font-medium">
          {{ denreesPrioritaires.map((d) => translateForUi(d.nom)).join(', ') }}
        </span>
        {{ i18n.t('menu.priority.followup') }}
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
          <button
            v-if="canOptimise"
            type="button"
            class="mt-1 text-xs font-medium"
            :class="
              joursVerrouilles.includes(jour.jour)
                ? 'text-amber-700'
                : 'text-gray-400 hover:text-gray-600'
            "
            @click="toggleVerrou(jour.jour)"
          >
            {{
              joursVerrouilles.includes(jour.jour)
                ? i18n.t('menu.optim.locked')
                : i18n.t('menu.optim.lock')
            }}
          </button>
        </div>
        <div class="min-w-[200px] flex-1">
          <label class="label text-xs">{{ i18n.t('menu.label.recipe') }}</label>
          <select
            class="input"
            :value="jour.recetteId ?? ''"
            :disabled="!presenceStore.pointageEffectue || joursVerrouilles.includes(jour.jour)"
            @change="updateJour(jour.jour, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ i18n.t('general.select') }}</option>
            <option v-for="r in recettesDisponibles" :key="r.id" :value="r.id">
              {{ translateForUi(r.nom) }}
              <template v-if="utiliseDenreePrioritaire(r)">
                <span class="ml-1 inline-flex items-center align-middle">
                  <Icon name="warning" className="h-3.5 w-3.5 text-amber-600" />
                </span>
              </template>
            </option>
          </select>
        </div>
        <div class="w-36">
          <label class="label text-xs">{{ i18n.t('menu.label.portions') }}</label>
          <input
            type="number"
            min="1"
            class="input"
            :value="jour.portionsPrevues"
            :disabled="!presenceStore.pointageEffectue"
            @change="updatePortions(jour.jour, Number(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="text-sm text-gray-500">
          {{ getRecetteNom(jour.recetteId) }}
        </div>
      </div>
    </div>

    <p class="mt-4 text-sm text-gray-500">
      {{ i18n.t('menu.note.recalculation') }}
    </p>
  </div>
</template>
