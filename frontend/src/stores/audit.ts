import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { generateId, loadFromStorage, saveToStorage } from '@/utils/helpers'
import type { AuditActionType, AuditEntry, UserRole } from '@/types'

const STORAGE_KEY = 'auditEntries'

function getLocationInfo(): string {
  if (typeof window === 'undefined') return 'local'
  const host = window.location.hostname || 'local'
  const platform = window.navigator.platform || 'browser'
  const userAgent = window.navigator.userAgent || 'browser'
  return `${host} · ${platform} · ${userAgent}`
}

function computeHashSync(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    hash ^= code
    hash = Math.imul(hash, 16777619)
  }

  const signed = hash >>> 0
  return signed.toString(16).padStart(8, '0')
}

function buildHashPayload(entry: AuditEntry) {
  const payload = { ...entry } as Record<string, unknown>
  delete payload.hash
  return JSON.stringify(payload)
}

function getSignedHashForEntry(entry: AuditEntry): string {
  const payload = buildHashPayload(entry)
  return computeHashSync(payload)
}

function normalizeEntries(raw: AuditEntry[] = []): AuditEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((entry) => entry && typeof entry === 'object')
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>(normalizeEntries(loadFromStorage<AuditEntry[]>(STORAGE_KEY, [])))

  const actionTypes = computed(() =>
    Array.from(new Set(entries.value.map((entry) => entry.actionType))),
  )

  function persist() {
    saveToStorage(STORAGE_KEY, entries.value)
  }

  function getPreviousHash() {
    return entries.value[0]?.hash ?? '0'
  }

  function getSignedAuditReport() {
    const reportPayload = JSON.stringify(entries.value)
    return {
      generatedAt: new Date().toISOString(),
      integrity: verifyChain(),
      entries: entries.value,
      signature: computeHashSync(reportPayload),
    }
  }

  function exportAuditReport() {
    if (typeof document === 'undefined') return

    const report = getSignedAuditReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sgp-cantine-audit-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function logAction(data: {
    actionType: AuditActionType
    actionLabel: string
    description: string
    module: string
    userId: string
    userName: string
    role: UserRole
    targetId?: string
    targetType?: string
    detail?: string
  }) {
    const entry: AuditEntry = {
      id: generateId('a'),
      userId: data.userId,
      userName: data.userName,
      role: data.role,
      module: data.module,
      actionType: data.actionType,
      actionLabel: data.actionLabel,
      description: data.description,
      targetId: data.targetId,
      targetType: data.targetType,
      detail: data.detail,
      timestamp: new Date().toISOString(),
      location: getLocationInfo(),
      previousHash: getPreviousHash(),
      hash: '',
    }

    entry.hash = getSignedHashForEntry(entry)
    entries.value.unshift(entry)
    persist()
  }

  function verifyChain(): boolean {
    if (!Array.isArray(entries.value) || entries.value.length === 0) {
      return true
    }

    for (let index = 0; index < entries.value.length; index += 1) {
      const current = entries.value[index]
      if (!current || !current.hash) return false

      const recomputedHash = getSignedHashForEntry(current)
      if (current.hash !== recomputedHash) {
        return false
      }

      const next = entries.value[index + 1]
      if (index === entries.value.length - 1) {
        if (current.previousHash !== '0') {
          return false
        }
      } else if (current.previousHash !== next.hash) {
        return false
      }
    }

    return true
  }

  return {
    entries,
    actionTypes,
    logAction,
    verifyChain,
    getSignedAuditReport,
    exportAuditReport,
  }
})
