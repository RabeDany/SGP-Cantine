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

async function computeHash(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function') {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `f_${hash.toString(16)}`
}

function buildHashPayload(entry: AuditEntry) {
  const payload = { ...entry } as Record<string, unknown>
  delete payload.hash
  return JSON.stringify(payload)
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>(loadFromStorage<AuditEntry[]>(STORAGE_KEY, []))

  const actionTypes = computed(() =>
    Array.from(new Set(entries.value.map((entry) => entry.actionType))),
  )

  function persist() {
    saveToStorage(STORAGE_KEY, entries.value)
  }

  function getPreviousHash() {
    return entries.value[0]?.hash ?? '0'
  }

  async function logAction(data: {
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
      hash: 'pending',
    }

    entries.value.unshift(entry)
    persist()

    const hashPayload = buildHashPayload(entry)
    entry.hash = await computeHash(hashPayload)
    persist()
  }

  function verifyChain(): boolean {
    for (let index = 0; index < entries.value.length; index += 1) {
      const current = entries.value[index]
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
  }
})
