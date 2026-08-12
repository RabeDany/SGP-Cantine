<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useCommandeStore } from '@/stores/commande'
import { useMenuStore } from '@/stores/menu'
import { useStockStore } from '@/stores/stock'
import { useI18nStore } from '@/stores/i18n'
import { UNITE_LABELS, type BonCommande, type LigneReceptionBonCommande } from '@/types'
import { todayISO } from '@/utils/helpers'
import { translateForUi } from '@/utils/foodTranslator'

const auth = useAuthStore()
const commandeStore = useCommandeStore()
const stockStore = useStockStore()
const menuStore = useMenuStore()
const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()

const fournisseurId = ref('')
const dateCommande = ref(todayISO())
const dateLivraisonSouhaitee = ref(todayISO())
const quantites = ref<Record<string, number>>({})
const validationError = ref('')
const showReceptionModal = ref(false)
const showDetailModal = ref(false)
const receptionBon = ref<BonCommande | null>(null)
const detailBon = ref<BonCommande | null>(null)
const receptionLines = ref<Record<string, { quantiteCommandee: number; quantiteRecue: number; commentaire: string }>>({})
const receptionError = ref('')
const prefillLoaded = ref(false)

const fournisseursActifs = computed(() => commandeStore.fournisseurs.filter((f) => f.actif))
const denreesActives = computed(() => stockStore.denrees.filter((d) => d.actif))
const bons = computed(() => commandeStore.bonsCommande)

function persistDefaultFournisseur() {
  if (!fournisseurId.value && fournisseursActifs.value.length) {
    fournisseurId.value = fournisseursActifs.value[0].id
  }
}

function resolveRouteString(queryValue: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  if (Array.isArray(queryValue)) {
    const first = queryValue[0]
    return typeof first === 'string' ? first : undefined
  }
  return typeof queryValue === 'string' ? queryValue : undefined
}

function prefillFromListeCourses() {
  if (prefillLoaded.value) return
  prefillLoaded.value = true

  const fromCourses = resolveRouteString(route.query.fromCourses) === '1'
  const fromStock = resolveRouteString(route.query.fromStock) === '1'

  if (fromCourses) {
    const linesParam = resolveRouteString(route.query.lines)
    if (linesParam) {
      try {
        const lines = JSON.parse(linesParam) as Array<{ denreeId: string; quantite: number }>
        if (lines.length) {
          lines.forEach((line) => {
            if (line.quantite > 0) {
              quantites.value[line.denreeId] = line.quantite
            }
          })
          persistDefaultFournisseur()
          router.replace({ name: 'commandes' })
          return
        }
      } catch {
        // ignore malformed payload
      }
    }

    const needs = menuStore.denreesManquantes
    if (!needs.length) {
      router.replace({ name: 'commandes' })
      return
    }
    needs.forEach((item) => {
      if (item.manquant > 0) {
        quantites.value[item.denreeId] = item.manquant
      }
    })
    persistDefaultFournisseur()
    router.replace({ name: 'commandes' })
    return
  }

  if (fromStock) {
    const linesParam = resolveRouteString(route.query.lines)
    if (linesParam) {
      try {
        const lines = JSON.parse(linesParam) as Array<{ denreeId: string; quantite: number }>
        lines.forEach((line) => {
          if (line.quantite > 0) {
            quantites.value[line.denreeId] = line.quantite
          }
        })
      } catch {
        // ignore malformed payload
      }
    }
    persistDefaultFournisseur()
    router.replace({ name: 'commandes' })
  }
}

onMounted(() => {
  prefillFromListeCourses()
})

watch(
  () => route.query,
  () => {
    if (!prefillLoaded.value) {
      prefillFromListeCourses()
    }
  },
  { deep: true },
)

function submitBonCommande() {
  if (!fournisseurId.value || !dateCommande.value || !dateLivraisonSouhaitee.value) return
  const lignes = Object.entries(quantites.value)
    .filter(([, qte]) => qte > 0)
    .map(([denreeId, qte]) => ({ denreeId, quantite: qte }))
  if (!lignes.length) return
  commandeStore.createBonCommande(
    {
      fournisseurId: fournisseurId.value,
      emetteurId: auth.currentUser?.id ?? 'unknown',
      dateCommande: dateCommande.value,
      dateLivraisonSouhaitee: dateLivraisonSouhaitee.value,
      lignes,
    },
    auth.currentUser
      ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role }
      : undefined,
  )
  quantites.value = {}
}

function canValidateBon(bon: BonCommande) {
  return (
    auth.currentUser !== null &&
    bon.statut === 'emitted' &&
    bon.emetteurId !== auth.currentUser.id
  )
}

function canReceiveBon(bon: BonCommande) {
  return bon.statut === 'validated'
}

function validerBon(bonId: string) {
  validationError.value = ''
  if (!auth.currentUser) return
  const bon = commandeStore.bonsCommande.find((b) => b.id === bonId)
  if (!bon) return
  if (bon.emetteurId === auth.currentUser.id) {
    validationError.value = 'Un autre utilisateur doit valider ce bon.'
    return
  }
  if (!commandeStore.validateBonCommande(bonId, auth.currentUser.id, auth.currentUser ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role } : undefined)) {
    validationError.value = 'Impossible de valider ce bon, il est peut-être déjà validé.'
  }
}

function openReceptionModal(bon: BonCommande) {
  receptionError.value = ''
  receptionBon.value = bon
  receptionLines.value = {}
  bon.lignes.forEach((ligne) => {
    receptionLines.value[ligne.denreeId] = {
      quantiteCommandee: ligne.quantite,
      quantiteRecue: ligne.quantite,
      commentaire: '',
    }
  })
  showReceptionModal.value = true
}

function closeReceptionModal() {
  showReceptionModal.value = false
  receptionBon.value = null
}

function openDetailModal(bon: BonCommande) {
  detailBon.value = bon
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  detailBon.value = null
}

function confirmReception() {
  if (!auth.currentUser || !receptionBon.value) return
  const receptionLignesArray: LigneReceptionBonCommande[] = Object.entries(receptionLines.value).map(
    ([denreeId, data]) => ({
      denreeId,
      quantiteCommandee: data.quantiteCommandee,
      quantiteRecue: data.quantiteRecue,
      ecart: data.quantiteCommandee - data.quantiteRecue,
      commentaire: data.commentaire || undefined,
    }),
  )
  if (!receptionLignesArray.some((ligne) => ligne.quantiteRecue > 0)) {
    receptionError.value = 'Veuillez saisir au moins une quantité reçue supérieure à 0.'
    return
  }

  for (const ligne of receptionLignesArray) {
    if (ligne.quantiteRecue > 0) {
      stockStore.enregistrerEntree({
        denreeId: ligne.denreeId,
        date: todayISO(),
        quantite: ligne.quantiteRecue,
        provenance: 'achat_local',
        userId: auth.currentUser.id,
      })
    }
  }

  if (!commandeStore.receiveBonCommande(
    receptionBon.value.id,
    receptionLignesArray,
    auth.currentUser.id,
    auth.currentUser ? { id: auth.currentUser.id, nom: auth.currentUser.nom, role: auth.currentUser.role } : undefined,
  )) {
    receptionError.value = 'Erreur lors de la réception. Vérifiez le statut du bon.'
    return
  }

  closeReceptionModal()
}

function totalReceptionCommandee() {
  return Object.values(receptionLines.value).reduce((sum, line) => sum + line.quantiteCommandee, 0)
}

function totalReceptionRecue() {
  return Object.values(receptionLines.value).reduce((sum, line) => sum + line.quantiteRecue, 0)
}

function totalReceptionEcart() {
  return totalReceptionCommandee() - totalReceptionRecue()
}

function receptionHasSurplus() {
  return totalReceptionEcart() < 0
}

function formatStatut(statut: string) {
  if (statut === 'emitted') return i18n.t('commandes.status.emitted')
  if (statut === 'validated') return i18n.t('commandes.status.validated')
  if (statut === 'partially_received') return i18n.t('commandes.status.partiallyReceived')
  return i18n.t('commandes.status.received')
}

function getFournisseurName(id: string) {
  return commandeStore.getFournisseur(id)?.nom ?? id
}

function getUsername(id: string) {
  return auth.users.find((u) => u.id === id)?.nom ?? id
}
</script>

<template>
  <div>
    <PageHeader
      :title="i18n.t('commandes.title')"
      :subtitle="i18n.t('commandes.subtitle')"
    />

    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">{{ i18n.t('commandes.selectSupplier') }}</label>
        <select v-model="fournisseurId" class="input">
          <option value="">{{ i18n.t('commandes.selectSupplierPlaceholder') }}</option>
          <option v-for="f in fournisseursActifs" :key="f.id" :value="f.id">
            {{ f.nom }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ i18n.t('commandes.orderDate') }}</label>
        <input v-model="dateCommande" type="date" class="input" />
      </div>
      <div>
        <label class="label">{{ i18n.t('commandes.deliveryDate') }}</label>
        <input v-model="dateLivraisonSouhaitee" type="date" class="input" />
      </div>
    </div>

    <div class="card mb-6">
      <p class="label">Lignes de commande</p>
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="d in denreesActives"
          :key="d.id"
          class="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div class="mb-2 font-medium">{{ translateForUi(d.nom) }}</div>
          <div class="text-gray-500 text-sm">{{ d.categorie }} · {{ UNITE_LABELS[d.unite] }}</div>
          <input
            type="number"
            min="0"
            step="0.1"
            class="input mt-3"
            v-model.number="quantites[d.id]"
            placeholder="Quantité"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="btn-primary" @click="submitBonCommande">
          {{ i18n.t('commandes.saveOrder') }}
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">{{ i18n.t('commandes.table.ref') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.supplier') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.date') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.delivery') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.lines') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.status') }}</th>
            <th class="px-5 py-3">{{ i18n.t('commandes.table.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bon in bons" :key="bon.id" class="border-t border-gray-100">
            <td class="px-5 py-3 font-medium">{{ bon.id }}</td>
            <td class="px-5 py-3">{{ getFournisseurName(bon.fournisseurId) }}</td>
            <td class="px-5 py-3">{{ bon.dateCommande }}</td>
            <td class="px-5 py-3">{{ bon.dateLivraisonSouhaitee }}</td>
            <td class="px-5 py-3 text-gray-600">{{ bon.lignes.length }} ligne(s)</td>
            <td class="px-5 py-3">
              <div>{{ formatStatut(bon.statut) }}</div>
              <div class="text-xs text-gray-500 mt-1">
                Émis par {{ getUsername(bon.emetteurId) }}
                <template v-if="bon.valideurId">
                  · Validé par {{ getUsername(bon.valideurId) }}
                </template>
                <template v-if="bon.receptionParId">
                  · Reçu par {{ getUsername(bon.receptionParId) }}
                </template>
              </div>
            </td>
            <td class="px-5 py-3 space-y-2">
              <button
                type="button"
                class="btn-secondary w-full"
                @click="openDetailModal(bon)"
              >
                👁️ {{ i18n.t('commandes.detail') }}
              </button>
              <button
                v-if="canValidateBon(bon)"
                type="button"
                class="btn-secondary w-full"
                @click="validerBon(bon.id)"
              >
                {{ i18n.t('commandes.validate') }}
              </button>
              <button
                v-else-if="bon.statut === 'emitted'"
                type="button"
                class="btn-disabled w-full"
                disabled
              >
                {{ i18n.t('commandes.waitingValidation') }}
              </button>
              <button
                v-if="canReceiveBon(bon)"
                type="button"
                class="btn-primary w-full"
                @click="openReceptionModal(bon)"
              >
                {{ i18n.t('commandes.reception') }}
              </button>
              <div v-if="bon.statut === 'received' || bon.statut === 'partially_received'" class="text-xs text-gray-600">
                Qté reçue: {{ bon.quantiteRecue }} · Écart: {{ bon.ecart }}
              </div>
            </td>
          </tr>
          <tr v-if="!bons.length">
            <td colspan="7" class="px-5 py-6 text-center text-gray-500">Aucun bon de commande enregistré.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="validationError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ validationError }}
    </div>

    <div
      v-if="showDetailModal && detailBon"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Détail du bon {{ detailBon.id }}</h2>
            <p class="text-sm text-gray-500">Fournisseur : {{ getFournisseurName(detailBon.fournisseurId) }}</p>
          </div>
          <button type="button" class="text-gray-500 hover:text-gray-900" @click="closeDetailModal">✕</button>
        </div>

        <div class="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          <div
            v-for="ligne in detailBon.lignes"
            :key="ligne.denreeId"
            class="rounded-lg border border-gray-200 p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-medium">{{ stockStore.getDenree(ligne.denreeId)?.nom || ligne.denreeId }}</p>
                <p class="text-xs text-gray-500">Quantité commandée : {{ ligne.quantite }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {{ UNITE_LABELS[stockStore.getDenree(ligne.denreeId)?.unite ?? 'unite'] }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button type="button" class="btn-secondary" @click="closeDetailModal">Fermer</button>
        </div>
      </div>
    </div>

    <div
      v-if="showReceptionModal && receptionBon"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Réception du bon {{ receptionBon.id }}</h2>
            <p class="text-sm text-gray-500">Fournisseur : {{ getFournisseurName(receptionBon.fournisseurId) }}</p>
          </div>
          <button type="button" class="text-gray-500 hover:text-gray-900" @click="closeReceptionModal">✕</button>
        </div>

        <div class="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
          <div
            v-for="ligne in receptionBon.lignes"
            :key="ligne.denreeId"
            class="rounded-xl border border-gray-200 p-4"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="font-medium">{{ stockStore.getDenree(ligne.denreeId)?.nom || ligne.denreeId }}</p>
                <p class="text-xs text-gray-500">
                  Commandé {{ ligne.quantite }} · unité {{ UNITE_LABELS[stockStore.getDenree(ligne.denreeId)?.unite ?? 'unite'] }}
                </p>
              </div>
              <div class="grid gap-2 sm:grid-cols-2 sm:items-end">
                <label class="block text-xs text-gray-600">
                  Qté reçue
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    class="input mt-1"
                    v-model.number="receptionLines[ligne.denreeId].quantiteRecue"
                  />
                </label>
                <p class="text-sm text-gray-500">
                  Écart : {{ receptionLines[ligne.denreeId].quantiteCommandee - receptionLines[ligne.denreeId].quantiteRecue }}
                </p>
              </div>
            </div>
            <label class="block text-xs text-gray-600">
              Commentaire réception (optionnel)
              <textarea
                rows="2"
                class="input mt-1 min-h-[72px] resize-none"
                v-model="receptionLines[ligne.denreeId].commentaire"
                placeholder="Saisir une observation"
              />
            </label>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div class="space-y-1 text-sm text-gray-600">
            <p>Quantité totale reçue :
              {{ totalReceptionRecue() }}
            </p>
            <p>Écart total :
              {{ totalReceptionEcart() }}
            </p>
            <p v-if="receptionHasSurplus()" class="text-sm text-yellow-700">
              Attention : écart négatif détecté, surplus de réception. Vérifiez la livraison.
            </p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary" @click="closeReceptionModal">Annuler</button>
            <button type="button" class="btn-primary" @click="confirmReception">Confirmer réception</button>
          </div>
        </div>

        <div v-if="receptionError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ receptionError }}
        </div>
      </div>
    </div>
  </div>
</template>
