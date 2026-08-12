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

  function formatPeriodLabel(dateIso: string, kind: 'day' | 'week' | 'month') {
    const date = new Date(`${dateIso}T00:00:00`)

    if (kind === 'day') {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }

    if (kind === 'week') {
      const start = new Date(date)
      const day = start.getDay() || 7
      start.setDate(start.getDate() - day + 1)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)

      return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
    }

    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
  }

  function getPresenceHistorySummary(
    classId: string | null = null,
    kind: 'day' | 'week' | 'month' = 'day',
  ) {
    const relevant = pointages.value.filter((pointage) => {
      if (classId === null) return pointage.classeId === null
      return pointage.classeId === classId
    })

    const groups = new Map<string, { presents: number; inscrits: number }>()

    for (const pointage of relevant) {
      let key = pointage.date

      if (kind === 'week') {
        const date = new Date(`${pointage.date}T00:00:00`)
        const day = date.getDay() || 7
        date.setDate(date.getDate() - day + 1)
        key = date.toISOString().split('T')[0]
      }

      if (kind === 'month') {
        key = pointage.date.slice(0, 7)
      }

      const current = groups.get(key) ?? { presents: 0, inscrits: 0 }
      current.presents += pointage.presents
      current.inscrits += pointage.inscrits
      groups.set(key, current)
    }

    return Array.from(groups.entries())
      .map(([key, value]) => ({
        key,
        label: formatPeriodLabel(key, kind),
        presents: value.presents,
        inscrits: value.inscrits,
        taux: value.inscrits > 0 ? Math.round((value.presents / value.inscrits) * 100) : 0,
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
  }

  function getAttendancePredictionHistory(days = 28) {
    return getPresenceHistorySummary(null, 'day').slice(-days)
  }

  function getAttendancePredictionData() {
    const history = getAttendancePredictionHistory()
    const byWeekday = new Map<number, { sum: number; count: number }>()
    let historySum = 0

    for (const row of history) {
      const weekday = new Date(`${row.key}T00:00:00`).getDay()
      const stats = byWeekday.get(weekday) ?? { sum: 0, count: 0 }
      stats.sum += row.taux
      stats.count += 1
      byWeekday.set(weekday, stats)
      historySum += row.taux
    }

    const overallAverage = history.length ? historySum / history.length : 0
    return { byWeekday, overallAverage }
  }

  function predictAttendanceForDate(dateIso: string) {
    const { byWeekday, overallAverage } = getAttendancePredictionData()
    const date = new Date(`${dateIso}T00:00:00`)
    const weekdayStats = byWeekday.get(date.getDay())
    const predictedRate = Number(
      ((weekdayStats ? weekdayStats.sum / weekdayStats.count : overallAverage) || 0).toFixed(1),
    )
    const lowerRate = Math.max(0, predictedRate - 8)
    const upperRate = Math.min(100, predictedRate + 8)
    const predictedCount = Math.round((totalInscrits.value * predictedRate) / 100)
    const lowerCount = Math.round((totalInscrits.value * lowerRate) / 100)
    const upperCount = Math.round((totalInscrits.value * upperRate) / 100)

    return { predictedRate, lowerRate, upperRate, predictedCount, lowerCount, upperCount }
  }

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
    getPresenceHistorySummary,
    getAttendancePredictionHistory,
    getAttendancePredictionData,
    predictAttendanceForDate,
    enregistrerPointageGlobal,
    enregistrerPointageParClasse,
  }
})
