import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mockClasses, mockPointages } from '@/data/mockData'
import { generateId, loadFromStorage, saveToStorage, todayISO } from '@/utils/helpers'
import { useAuditStore } from '@/stores/audit'
import type { AuditActionType, Classe, PointagePresence, UserRole } from '@/types'

export const usePresenceStore = defineStore('presence', () => {
  const classes = ref<Classe[]>(loadFromStorage('classes', [...mockClasses]))
  const pointages = ref<PointagePresence[]>(loadFromStorage('pointages', [...mockPointages]))

  function persist() {
    saveToStorage('classes', classes.value)
    saveToStorage('pointages', pointages.value)
  }

  const totalInscrits = computed(() =>
    classes.value.reduce((s, c) => s + c.inscritsCantine, 0),
  )

  function sanitizePointages() {
    pointages.value = pointages.value.map((pointage) => {
      const maxAllowed = pointage.classeId
        ? classes.value.find((classe) => classe.id === pointage.classeId)?.inscritsCantine ?? pointage.inscrits
        : totalInscrits.value

      return {
        ...pointage,
        presents: Math.max(0, Math.min(pointage.presents, maxAllowed)),
        inscrits: maxAllowed,
      }
    })
  }

  sanitizePointages()

  const pointageDuJour = computed(() => {
    const today = todayISO()
    return pointages.value.find((p) => p.date === today) ?? null
  })

  const pointageEffectue = computed(() => !!pointageDuJour.value)

  function getPointageGlobalPourDate(date: string) {
    return pointages.value.find((p) => p.date === date && p.classeId === null) ?? null
  }

  function totalPresentsPourDate(date: string) {
    const global = getPointageGlobalPourDate(date)
    if (global) return global.presents
    return pointages.value
      .filter((p) => p.date === date && p.classeId !== null)
      .reduce((sum, p) => sum + p.presents, 0)
  }

  function isPointageEffectuePourDate(date: string) {
    return pointages.value.some((p) => p.date === date)
  }

  function enregistrerPointageGlobal(data: {
    presents: number
    exemptions: number
    userId: string
  }, user?: { id: string; nom: string; role: UserRole }) {
    const today = todayISO()
    const inscrits = totalInscrits.value
    if (data.presents + data.exemptions > inscrits) {
      return {
        ok: false,
        error: `Le total des présents et exemptions ne peut pas dépasser ${inscrits} élèves inscrits.`,
      }
    }

    const existing = pointages.value.find((p) => p.date === today && p.classeId === null)
    if (existing) {
      existing.presents = data.presents
      existing.exemptions = data.exemptions
      existing.inscrits = inscrits
    } else {
      pointages.value.unshift({
        id: generateId('p'),
        date: today,
        classeId: null,
        presents: data.presents,
        inscrits,
        exemptions: data.exemptions,
        userId: data.userId,
        createdAt: new Date().toISOString(),
      })
    }
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'presence_global',
        actionLabel: 'Pointage global',
        description: `Pointage global enregistré par ${user.nom}`,
        module: 'presence',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: data.userId,
        targetType: 'attendance',
      })
    }
    return { ok: true }
  }

  function enregistrerPointageParClasse(
    classeId: string,
    presents: number,
    exemptions: number,
    userId: string,
    user?: { id: string; nom: string; role: UserRole },
  ) {
    const today = todayISO()
    const classe = classes.value.find((c) => c.id === classeId)
    if (!classe) return { ok: false, error: 'Classe introuvable.' }

    if (presents + exemptions > classe.inscritsCantine) {
      return {
        ok: false,
        error: `Le total des présents et exemptions ne peut pas dépasser ${classe.inscritsCantine} inscrits pour ${classe.nom}.`,
      }
    }

    const existing = pointages.value.find((p) => p.date === today && p.classeId === classeId)
    if (existing) {
      existing.presents = presents
      existing.exemptions = exemptions
    } else {
      pointages.value.unshift({
        id: generateId('p'),
        date: today,
        classeId,
        presents,
        inscrits: classe.inscritsCantine,
        exemptions,
        userId,
        createdAt: new Date().toISOString(),
      })
    }
    persist()
    if (user) {
      const audit = useAuditStore()
      void audit.logAction({
        actionType: 'presence_class',
        actionLabel: 'Pointage par classe',
        description: `Pointage de la classe ${classe?.nom ?? classeId} enregistré par ${user.nom}`,
        module: 'presence',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        targetId: classeId,
        targetType: 'class',
      })
    }
    return { ok: true }
  }

  const pointagesParClasseAujourdhui = computed(() => {
    const today = todayISO()
    return classes.value.map((classe) => {
      const pt = pointages.value.find((p) => p.date === today && p.classeId === classe.id)
      return { classe, pointage: pt ?? null }
    })
  })

  const totalPresentsAujourdhui = computed(() => {
    const today = todayISO()
    const global = pointages.value.find((p) => p.date === today && p.classeId === null)
    if (global) return global.presents
    return pointagesParClasseAujourdhui.value.reduce(
      (s, { pointage }) => s + (pointage?.presents ?? 0),
      0,
    )
  })

  return {
    classes,
    pointages,
    totalInscrits,
    pointageDuJour,
    pointageEffectue,
    pointagesParClasseAujourdhui,
    totalPresentsAujourdhui,
    getPointageGlobalPourDate,
    totalPresentsPourDate,
    isPointageEffectuePourDate,
    enregistrerPointageGlobal,
    enregistrerPointageParClasse,
  }
})
