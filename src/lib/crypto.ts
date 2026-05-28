import { supabase } from './supabase'

const KEY_ALGO = { name: 'AES-GCM', length: 256 } as const
const BASE64_CHUNK_SIZE = 0x8000
const IV_BYTES = 12
const GZIP_PREFIX = 'fs2:gzip:'
const RAW_PREFIX = 'fs2:raw:'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + BASE64_CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function canCompress() {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

async function transformBytes(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const source = new Blob([toArrayBuffer(bytes)]).stream()
  return new Uint8Array(await new Response(source.pipeThrough(stream)).arrayBuffer())
}

async function maybeCompress(bytes: Uint8Array) {
  return canCompress()
    ? { bytes: await transformBytes(bytes, new CompressionStream('gzip')), prefix: GZIP_PREFIX }
    : { bytes, prefix: RAW_PREFIX }
}

async function maybeDecompress(bytes: Uint8Array, prefix: string) {
  return prefix === GZIP_PREFIX ? transformBytes(bytes, new DecompressionStream('gzip')) : bytes
}

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(KEY_ALGO, true, ['encrypt', 'decrypt'])
}

async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return bytesToBase64(new Uint8Array(raw))
}

async function importKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(b64)
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), KEY_ALGO, true, ['encrypt', 'decrypt'])
}

export async function getOrCreateKey(userId: string): Promise<CryptoKey> {
  const { data } = await supabase
    .from('user_keys')
    .select('key_b64')
    .eq('user_id', userId)
    .maybeSingle()

  if (data?.key_b64) return importKey(data.key_b64)

  const key = await generateKey()
  const key_b64 = await exportKey(key)
  await supabase.from('user_keys').insert({ user_id: userId, key_b64 })
  return key
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const { bytes, prefix } = await maybeCompress(encoder.encode(plaintext))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(bytes))
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return `${prefix}${bytesToBase64(combined)}`
}

export async function decrypt(key: CryptoKey, b64: string): Promise<string> {
  const prefix = b64.startsWith(GZIP_PREFIX) ? GZIP_PREFIX : b64.startsWith(RAW_PREFIX) ? RAW_PREFIX : ''
  const combined = base64ToBytes(prefix ? b64.slice(prefix.length) : b64)
  const iv = combined.slice(0, IV_BYTES)
  const ciphertext = combined.slice(IV_BYTES)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext))
  const bytes = prefix ? await maybeDecompress(new Uint8Array(plaintext), prefix) : new Uint8Array(plaintext)
  return decoder.decode(bytes)
}
