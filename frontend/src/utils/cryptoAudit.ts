/**
 * Utilitaires cryptographiques pour la chaîne d'audit (US-43 / US-44).
 * SHA-256 + ECDSA P-256 via Web Crypto API.
 */

const KEY_STORAGE = 'sgp-cantine-audit-signing-key'
const GENESIS_HASH = '0'

export function getGenesisHash() {
  return GENESIS_HASH
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export function isSha256Hex(value: string | undefined | null): boolean {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

/** Hash de l'enregistrement modifié (cible de l'action). */
export async function computeRecordHash(parts: {
  targetId?: string
  targetType?: string
  detail?: string
}): Promise<string> {
  const payload = JSON.stringify({
    targetId: parts.targetId ?? null,
    targetType: parts.targetType ?? null,
    detail: parts.detail ?? null,
  })
  return sha256Hex(payload)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

/** Payload haché pour une entrée d'audit (sans le champ `hash`). */
export function buildEntryHashPayload(entry: Record<string, unknown>): string {
  const copy = { ...entry }
  delete copy.hash
  return stableStringify(copy)
}

export async function hashAuditEntry(entry: Record<string, unknown>): Promise<string> {
  return sha256Hex(buildEntryHashPayload(entry))
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
}

/**
 * Charge ou crée la paire de clés locale.
 * La clé privée reste dans localStorage — jamais dans les exports.
 */
export async function ensureSigningKeyPair(): Promise<{
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicKeyJwk: JsonWebKey
}> {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_STORAGE) : null
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { privateKey: JsonWebKey; publicKey: JsonWebKey }
      const privateKey = await importPrivateKey(parsed.privateKey)
      const publicKey = await importPublicKey(parsed.publicKey)
      return { privateKey, publicKey, publicKeyJwk: parsed.publicKey }
    } catch {
      // régénération si clé corrompue
    }
  }

  const pair = await generateKeyPair()
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      KEY_STORAGE,
      JSON.stringify({ privateKey: privateKeyJwk, publicKey: publicKeyJwk }),
    )
  }
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, publicKeyJwk }
}

export async function signPayload(payload: string): Promise<{
  signature: string
  publicKeyJwk: JsonWebKey
  algorithm: 'ECDSA-P256-SHA256'
  payloadHash: string
}> {
  const { privateKey, publicKeyJwk } = await ensureSigningKeyPair()
  const data = new TextEncoder().encode(payload)
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data,
  )
  return {
    signature: toBase64(signatureBuffer),
    publicKeyJwk,
    algorithm: 'ECDSA-P256-SHA256',
    payloadHash: await sha256Hex(payload),
  }
}

export async function verifyPayloadSignature(
  payload: string,
  signatureBase64: string,
  publicKeyJwk: JsonWebKey,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyJwk)
    const data = new TextEncoder().encode(payload)
    return crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      fromBase64(signatureBase64),
      data,
    )
  } catch {
    return false
  }
}

export function getPublicKeyOnly(): Promise<JsonWebKey> {
  return ensureSigningKeyPair().then((k) => k.publicKeyJwk)
}
