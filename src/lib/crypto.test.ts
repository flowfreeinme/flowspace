import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from './crypto'

let key: CryptoKey
const LEGACY_IV_BYTES = 12

beforeAll(async () => {
  key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
})

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function legacyEncrypt(plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(LEGACY_IV_BYTES))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toArrayBuffer(encoded))
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

function tamper(ciphertext: string) {
  const [prefix, payload] = ciphertext.startsWith('fs2:')
    ? [ciphertext.slice(0, ciphertext.lastIndexOf(':') + 1), ciphertext.slice(ciphertext.lastIndexOf(':') + 1)]
    : ['', ciphertext]
  const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
  bytes[20] ^= 0xff
  return `${prefix}${btoa(String.fromCharCode(...bytes))}`
}

describe('encrypt / decrypt', () => {
  it('round-trips a string', async () => {
    const plain = JSON.stringify({ hello: 'world', num: 42 })
    const ciphertext = await encrypt(key, plain)
    const result = await decrypt(key, ciphertext)
    expect(result).toBe(plain)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const plain = 'same input'
    const a = await encrypt(key, plain)
    const b = await encrypt(key, plain)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const plain = 'tamper test'
    const ciphertext = await encrypt(key, plain)
    await expect(decrypt(key, tamper(ciphertext))).rejects.toThrow()
  })

  it('keeps reading the original unversioned encrypted format', async () => {
    const plain = JSON.stringify({ old: true, value: 'legacy workspace' })
    const ciphertext = await legacyEncrypt(plain)

    await expect(decrypt(key, ciphertext)).resolves.toBe(plain)
  })

  it('round-trips large workspace payloads without overflowing base64 encoding', async () => {
    const plain = JSON.stringify({
      blocks: Array.from({ length: 8000 }, (_, i) => ({
        id: `block-${i}`,
        content: 'private workspace text '.repeat(8),
      })),
    })

    const ciphertext = await encrypt(key, plain)

    await expect(decrypt(key, ciphertext)).resolves.toBe(plain)
  })

  it('compresses repetitive workspace payloads before encryption when supported', async () => {
    const plain = JSON.stringify({
      blocks: Array.from({ length: 2000 }, (_, i) => ({
        id: `block-${i}`,
        content: 'same private workspace text '.repeat(20),
      })),
    })

    const ciphertext = await encrypt(key, plain)

    expect(ciphertext.startsWith('fs2:gzip:') || ciphertext.startsWith('fs2:raw:')).toBe(true)
    if (ciphertext.startsWith('fs2:gzip:')) {
      expect(ciphertext.length).toBeLessThan(plain.length)
    }
  })
})
