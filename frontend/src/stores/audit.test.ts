import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuditStore } from '@/stores/audit'
import { isSha256Hex, sha256Hex, signPayload, verifyPayloadSignature } from '@/utils/cryptoAudit'

const storage = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
  clear: () => {
    storage.clear()
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size
  },
}

describe('cryptoAudit', () => {
  it('produit un SHA-256 hex de 64 caractères', async () => {
    const hash = await sha256Hex('sgp-cantine')
    expect(isSha256Hex(hash)).toBe(true)
    expect(hash).toBe(await sha256Hex('sgp-cantine'))
  })

  it('signe et vérifie un payload ECDSA (clé privée absente de la vérif)', async () => {
    const payload = JSON.stringify({ hello: 'audit' })
    const signed = await signPayload(payload)
    expect(signed.algorithm).toBe('ECDSA-P256-SHA256')
    expect(signed.publicKeyJwk.d).toBeUndefined()
    const ok = await verifyPayloadSignature(payload, signed.signature, signed.publicKeyJwk)
    expect(ok).toBe(true)
    const bad = await verifyPayloadSignature('tampered', signed.signature, signed.publicKeyJwk)
    expect(bad).toBe(false)
  })
})

describe('audit store US-43 / US-44', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
  })

  it('enregistre une entrée avec hash SHA-256 et recordHash', async () => {
    const audit = useAuditStore()
    await audit.logAction({
      actionType: 'login',
      actionLabel: 'Connexion',
      description: 'Test',
      module: 'auth',
      userId: 'u1',
      userName: 'Directeur',
      role: 'admin',
      targetId: 'u1',
      targetType: 'user',
    })

    expect(audit.entries).toHaveLength(1)
    expect(isSha256Hex(audit.entries[0].hash)).toBe(true)
    expect(isSha256Hex(audit.entries[0].recordHash)).toBe(true)
    expect(audit.entries[0].previousHash).toBe('0')
  })

  it('chaîne valide après plusieurs actions', async () => {
    const audit = useAuditStore()
    for (let i = 0; i < 3; i += 1) {
      await audit.logAction({
        actionType: 'stock_entry',
        actionLabel: 'Entrée stock',
        description: `Mouvement ${i}`,
        module: 'stock',
        userId: 'u2',
        userName: 'Stock',
        role: 'gestionnaire',
        targetId: `d${i}`,
        targetType: 'denree',
      })
    }

    const result = await audit.verifyChain()
    expect(result.valid).toBe(true)
    expect(result.checkedCount).toBe(3)
    expect(result.durationMs).toBeLessThan(5000)
  })

  it('identifie précisément l’entrée altérée', async () => {
    const audit = useAuditStore()
    await audit.logAction({
      actionType: 'menu_update',
      actionLabel: 'Modif menu',
      description: 'A',
      module: 'menu',
      userId: 'u3',
      userName: 'Cuisine',
      role: 'planificateur',
    })
    await audit.logAction({
      actionType: 'menu_update',
      actionLabel: 'Modif menu',
      description: 'B',
      module: 'menu',
      userId: 'u3',
      userName: 'Cuisine',
      role: 'planificateur',
    })

    const victim = audit.entries[1]
    victim.description = 'TAMPERED'

    const result = await audit.verifyChain()
    expect(result.valid).toBe(false)
    expect(result.brokenEntryId).toBe(victim.id)
    expect(result.reason).toMatch(/altéré|invalide/i)
  })

  it('exporte un rapport signé sans clé privée', async () => {
    const audit = useAuditStore()
    await audit.logAction({
      actionType: 'login',
      actionLabel: 'Connexion',
      description: 'Test export',
      module: 'auth',
      userId: 'u1',
      userName: 'Directeur',
      role: 'admin',
    })

    const report = await audit.getSignedAuditReport('bailleurs_fonds')
    expect(report.destination).toBe('bailleurs_fonds')
    expect(report.destinationLabel).toMatch(/bailleur/i)
    expect(report.signature.length).toBeGreaterThan(20)
    expect(report.publicKeyJwk.d).toBeUndefined()
    expect(report.algorithm).toBe('ECDSA-P256-SHA256')

    const ok = await audit.verifySignedReport(report)
    expect(ok).toBe(true)
  })
})
