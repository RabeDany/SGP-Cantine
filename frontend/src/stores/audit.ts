import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { generateId, loadFromStorage, saveToStorage } from '@/utils/helpers'
import {
  buildEntryHashPayload,
  computeRecordHash,
  getGenesisHash,
  hashAuditEntry,
  isSha256Hex,
  signPayload,
  verifyPayloadSignature,
} from '@/utils/cryptoAudit'
import type {
  AuditActionType,
  AuditChainVerification,
  AuditEntry,
  AuditReportDestination,
  SignedAuditReport,
  UserRole,
} from '@/types'

const STORAGE_KEY = 'auditEntries'

const DESTINATION_LABELS: Record<AuditReportDestination, string> = {
  autorites_scolaires: 'Autorités scolaires',
  bailleurs_fonds: 'Bailleurs de fonds',
}

function getLocationInfo(): string {
  if (typeof window === 'undefined') return 'poste-local'
  const host = window.location.hostname || 'localhost'
  const platform = window.navigator.platform || 'navigateur'
  // Pas d'IP réelle côté navigateur sans serveur — on journalise le poste local.
  return `poste:${host} · ${platform}`
}

function normalizeEntries(raw: AuditEntry[] = []): AuditEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      ...entry,
      recordHash: entry.recordHash ?? '',
    }))
}

function needsMigration(entries: AuditEntry[]): boolean {
  if (!entries.length) return false
  return entries.some((e) => !isSha256Hex(e.hash) || !isSha256Hex(e.recordHash || undefined))
}

export const useAuditStore = defineStore('audit', () => {
  const entries = ref<AuditEntry[]>(normalizeEntries(loadFromStorage<AuditEntry[]>(STORAGE_KEY, [])))
  const migrating = ref(false)
  const lastVerification = ref<AuditChainVerification | null>(null)

  const actionTypes = computed(() =>
    Array.from(new Set(entries.value.map((entry) => entry.actionType))),
  )

  function persist() {
    saveToStorage(STORAGE_KEY, entries.value)
  }

  function getPreviousHash() {
    return entries.value[0]?.hash ?? getGenesisHash()
  }

  /**
   * Migre une ancienne chaîne FNV vers SHA-256 (rebuild chronologique).
   */
  async function migrateLegacyChainIfNeeded() {
    if (migrating.value || !needsMigration(entries.value)) return
    migrating.value = true
    try {
      const chronological = [...entries.value].reverse()
      let previousHash = getGenesisHash()
      const rebuilt: AuditEntry[] = []

      for (const raw of chronological) {
        const recordHash =
          isSha256Hex(raw.recordHash)
            ? raw.recordHash
            : await computeRecordHash({
                targetId: raw.targetId,
                targetType: raw.targetType,
                detail: raw.detail,
              })

        const next: AuditEntry = {
          ...raw,
          recordHash,
          previousHash,
          hash: '',
        }
        next.hash = await hashAuditEntry(next as unknown as Record<string, unknown>)
        previousHash = next.hash
        rebuilt.push(next)
      }

      entries.value = rebuilt.reverse()
      persist()
    } finally {
      migrating.value = false
    }
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
    await migrateLegacyChainIfNeeded()

    const recordHash = await computeRecordHash({
      targetId: data.targetId,
      targetType: data.targetType,
      detail: data.detail,
    })

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
      recordHash,
      timestamp: new Date().toISOString(),
      location: getLocationInfo(),
      previousHash: getPreviousHash(),
      hash: '',
    }

    entry.hash = await hashAuditEntry(entry as unknown as Record<string, unknown>)
    entries.value.unshift(entry)
    persist()
  }

  /**
   * Vérifie l'intégrité de la chaîne (US-44).
   * Retourne l'identifiant précis de la première entrée compromise.
   */
  async function verifyChain(): Promise<AuditChainVerification> {
    const started = performance.now()
    await migrateLegacyChainIfNeeded()

    if (!entries.value.length) {
      const empty: AuditChainVerification = {
        valid: true,
        checkedCount: 0,
        durationMs: Number((performance.now() - started).toFixed(1)),
      }
      lastVerification.value = empty
      return empty
    }

    for (let index = 0; index < entries.value.length; index += 1) {
      const current = entries.value[index]
      if (!current?.hash) {
        const result: AuditChainVerification = {
          valid: false,
          brokenEntryId: current?.id,
          brokenIndex: index,
          reason: 'Entrée sans hash',
          checkedCount: index,
          durationMs: Number((performance.now() - started).toFixed(1)),
        }
        lastVerification.value = result
        return result
      }

      const recomputed = await hashAuditEntry(current as unknown as Record<string, unknown>)
      if (current.hash !== recomputed) {
        const result: AuditChainVerification = {
          valid: false,
          brokenEntryId: current.id,
          brokenIndex: index,
          reason: 'Hash de l’entrée invalide (contenu altéré)',
          checkedCount: index + 1,
          durationMs: Number((performance.now() - started).toFixed(1)),
        }
        lastVerification.value = result
        return result
      }

      const older = entries.value[index + 1]
      if (!older) {
        if (current.previousHash !== getGenesisHash()) {
          const result: AuditChainVerification = {
            valid: false,
            brokenEntryId: current.id,
            brokenIndex: index,
            reason: 'Hash précédent de la première entrée invalide (attendu : 0)',
            checkedCount: index + 1,
            durationMs: Number((performance.now() - started).toFixed(1)),
          }
          lastVerification.value = result
          return result
        }
      } else if (current.previousHash !== older.hash) {
        const result: AuditChainVerification = {
          valid: false,
          brokenEntryId: current.id,
          brokenIndex: index,
          reason: 'Rupture de chaînage avec l’entrée précédente',
          checkedCount: index + 1,
          durationMs: Number((performance.now() - started).toFixed(1)),
        }
        lastVerification.value = result
        return result
      }
    }

    const ok: AuditChainVerification = {
      valid: true,
      checkedCount: entries.value.length,
      durationMs: Number((performance.now() - started).toFixed(1)),
    }
    lastVerification.value = ok
    return ok
  }

  function buildReportPayload(
    integrity: AuditChainVerification,
    destination: AuditReportDestination,
  ) {
    return {
      version: 1 as const,
      generatedAt: new Date().toISOString(),
      destination,
      destinationLabel: DESTINATION_LABELS[destination],
      algorithm: 'ECDSA-P256-SHA256' as const,
      integrity,
      entries: entries.value,
    }
  }

  async function getSignedAuditReport(
    destination: AuditReportDestination = 'autorites_scolaires',
  ): Promise<SignedAuditReport> {
    const integrity = await verifyChain()
    const unsigned = buildReportPayload(integrity, destination)
    const payloadToSign = buildEntryHashPayload(unsigned as unknown as Record<string, unknown>)
    const signed = await signPayload(payloadToSign)

    return {
      ...unsigned,
      signature: signed.signature,
      publicKeyJwk: signed.publicKeyJwk,
      payloadHash: signed.payloadHash,
    }
  }

  async function verifySignedReport(report: SignedAuditReport): Promise<boolean> {
    const { signature, publicKeyJwk, payloadHash: _payloadHash, ...rest } = report
    const payload = buildEntryHashPayload(rest as unknown as Record<string, unknown>)
    return verifyPayloadSignature(payload, signature, publicKeyJwk)
  }

  async function exportAuditReport(
    destination: AuditReportDestination = 'autorites_scolaires',
    user?: { id: string; nom: string; role: UserRole },
  ) {
    if (typeof document === 'undefined') return null

    const report = await getSignedAuditReport(destination)
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sgp-cantine-audit-signe-${destination}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    if (user) {
      await logAction({
        actionType: 'audit_export',
        actionLabel: 'Export rapport d’audit signé',
        description: `Rapport signé exporté pour ${DESTINATION_LABELS[destination]} par ${user.nom}`,
        module: 'audit',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        detail: destination,
      })
    }

    return report
  }

  /** Ouvre une vue imprimable (PDF via dialogue navigateur) avec mention de destination. */
  async function printAuditReport(
    destination: AuditReportDestination = 'autorites_scolaires',
    user?: { id: string; nom: string; role: UserRole },
  ) {
    const report = await getSignedAuditReport(destination)
    if (typeof window === 'undefined') return report

    const rows = report.entries
      .slice(0, 200)
      .map(
        (e) =>
          `<tr>
            <td>${e.timestamp}</td>
            <td>${e.userName}</td>
            <td>${e.actionLabel}</td>
            <td>${e.description}</td>
            <td style="font-size:10px;word-break:break-all">${e.hash.slice(0, 16)}…</td>
          </tr>`,
      )
      .join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Rapport d'audit SGP-Cantine</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 8px}
        .meta{font-size:12px;color:#444;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #ddd;padding:6px;text-align:left}
        th{background:#f5f5f5}
        .ok{color:#047857}.bad{color:#b91c1c}
        .sig{font-size:10px;word-break:break-all;margin-top:16px}
      </style></head><body>
      <h1>SGP-Cantine — Rapport d'audit signé</h1>
      <div class="meta">
        <p><strong>Destination :</strong> ${report.destinationLabel}</p>
        <p><strong>Généré le :</strong> ${report.generatedAt}</p>
        <p><strong>Intégrité :</strong> <span class="${report.integrity.valid ? 'ok' : 'bad'}">${
          report.integrity.valid ? 'Chaîne intacte' : `Rupture — ${report.integrity.reason}`
        }</span></p>
        <p><strong>Algorithme :</strong> ${report.algorithm}</p>
        <p><strong>Entrées :</strong> ${report.entries.length}</p>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Description</th><th>Hash</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sig">
        <p><strong>Empreinte du rapport :</strong> ${report.payloadHash}</p>
        <p><strong>Signature (clé privée non exportée) :</strong> ${report.signature.slice(0, 64)}…</p>
      </div>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }

    if (user) {
      await logAction({
        actionType: 'audit_export',
        actionLabel: 'Impression rapport d’audit signé',
        description: `Rapport PDF/impression pour ${DESTINATION_LABELS[destination]} par ${user.nom}`,
        module: 'audit',
        userId: user.id,
        userName: user.nom,
        role: user.role,
        detail: `print:${destination}`,
      })
    }

    return report
  }

  async function logVerification(
    result: AuditChainVerification,
    user?: { id: string; nom: string; role: UserRole },
  ) {
    if (!user) return
    await logAction({
      actionType: 'audit_verify',
      actionLabel: 'Vérification intégrité audit',
      description: result.valid
        ? `Chaîne d’audit vérifiée OK (${result.checkedCount} entrées, ${result.durationMs} ms) par ${user.nom}`
        : `Rupture détectée (${result.brokenEntryId}) : ${result.reason}`,
      module: 'audit',
      userId: user.id,
      userName: user.nom,
      role: user.role,
      targetId: result.brokenEntryId,
      targetType: 'audit_entry',
      detail: result.valid ? 'ok' : result.reason,
    })
  }

  return {
    entries,
    actionTypes,
    lastVerification,
    destinationLabels: DESTINATION_LABELS,
    logAction,
    verifyChain,
    getSignedAuditReport,
    verifySignedReport,
    exportAuditReport,
    printAuditReport,
    logVerification,
    migrateLegacyChainIfNeeded,
  }
})
