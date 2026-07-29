<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useCommandeStore } from '@/stores/commande'
import { useMenuStore } from '@/stores/menu'
import { useStockStore } from '@/stores/stock'
import { UNITE_LABELS, type BonCommande, type LigneReceptionBonCommande } from '@/types'
import { todayISO } from '@/utils/helpers'

const auth = useAuthStore()
const commandeStore = useCommandeStore()
const stockStore = useStockStore()
const menuStore = useMenuStore()
const route = useRoute()
const router = useRouter()

const fournisseurId = ref('')
const dateCommande = ref(todayISO())
const dateLivraisonSouhaitee = ref(todayISO())
const quantites = ref<Record<string, number>>({})
const validationError = ref('')
const showReceptionModal = ref(false)
const receptionBon = ref<BonCommande | null>(null)
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

function prefillFromListeCourses() {
  if (prefillLoaded.value) return
  prefillLoaded.value = true

  const fromCourses = route.query.fromCourses === '1'
  const fromStock = route.query.fromStock === '1'

  if (fromCourses) {
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
    const linesParam = route.query.lines
    if (typeof linesParam === 'string') {
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

function submitBonCommande() {
  if (!fournisseurId.value || !dateCommande.value || !dateLivraisonSouhaitee.value) return
  const lignes = Object.entries(quantites.value)
    .filter(([, qte]) => qte > 0)
    .map(([denreeId, qte]) => ({ denreeId, quantite: qte }))
  if (!lignes.length) return
  commandeStore.createBonCommande({
    fournisseurId: fournisseurId.value,
    emetteurId: auth.currentUser?.id ?? 'unknown',
    dateCommande: dateCommande.value,
    dateLivraisonSouhaitee: dateLivraisonSouhaitee.value,
    lignes,
  })
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
  if (!commandeStore.validateBonCommande(bonId, auth.currentUser.id)) {
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

function confirmReception() {
  if (!auth.currentUser || !receptionBon.value) return
  const receptionLignesArray: LigneReceptionBonCommande[] = Object.entries(receptionLines.value).map(
    ([denreeId, data]) => ({
      denreeId,
      quantiteCommandee: data.quantiteCommandee,
      quantiteRecue: data.quantiteRecue,
      ecart: data.quantiteRecue - data.quantiteCommandee,
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

  if (!commandeStore.receiveBonCommande(receptionBon.value.id, receptionLignesArray, auth.currentUser.id)) {
    receptionError.value = 'Erreur lors de la réception. Vérifiez le statut du bon.'
    return
  }

  closeReceptionModal()
}

function formatStatut(statut: string) {
  return statut === 'emitted' ? 'Émis' : statut === 'validated' ? 'Validé' : 'Réceptionné'
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
      title="Bons de commande"
      subtitle="Créer un bon de commande à partir de la liste de courses et suivre son statut."
    />

    <div class="card mb-6 grid gap-4 lg:grid-cols-3">
      <div>
        <label class="label">Fournisseur</label>
        <select v-model="fournisseurId" class="input">
          <option value="">— Sélectionner —</option>
          <option v-for="f in fournisseursActifs" :key="f.id" :value="f.id">
            {{ f.nom }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">Date commande</label>
        <input v-model="dateCommande" type="date" class="input" />
      </div>
      <div>
        <label class="label">Date livraison souhaitée</label>
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
          <div class="mb-2 font-medium">{{ d.nom }}</div>
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
          Enregistrer le bon de commande
        </button>
      </div>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3">Réf</th>
            <th class="px-5 py-3">Fournisseur</th>
            <th class="px-5 py-3">Date</th>
            <th class="px-5 py-3">Livraison</th>
            <th class="px-5 py-3">Lignes</th>
            <th class="px-5 py-3">Statut</th>
            <th class="px-5 py-3">Action</th>
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
                v-if="canValidateBon(bon)"
                type="button"
                class="btn-secondary w-full"
                @click="validerBon(bon.id)"
              >
                Valider
              </button>
              <button
                v-else-if="bon.statut === 'emitted'"
                type="button"
                class="btn-disabled w-full"
                disabled
              >
                En attente d'un validateur
              </button>
              <button
                v-if="canReceiveBon(bon)"
                type="button"
                class="btn-primary w-full"
                @click="openReceptionModal(bon)"
              >
                Réception
              </button>
              <div v-if="bon.statut === 'received'" class="text-xs text-gray-600">
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
      v-if="showReceptionModal && receptionBon"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div class="w-full max-w-3xl overflow-hidden rounded-xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Réception du bon {{ receptionBon.id }}</h2>
            <p class="text-sm text-gray-500">Fournisseur : {{ getFournisseurName(receptionBon.fournisseurId) }}</p>
          </div>
          <button type="button" class="text-gray-500 hover:text-gray-900" @click="closeReceptionModal">✕</button>
        </div>

        <div class="space-y-4">
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
                  Écart : {{ receptionLines[ligne.denreeId].quantiteRecue - receptionLines[ligne.denreeId].quantiteCommandee }}
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
              {{ Object.values(receptionLines).reduce((sum, line) => sum + line.quantiteRecue, 0) }}
            </p>
            <p>Écart total :
              {{ Object.values(receptionLines).reduce((sum, line) => sum + (line.quantiteRecue - line.quantiteCommandee), 0) }}
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
