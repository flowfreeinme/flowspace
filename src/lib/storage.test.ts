import { describe, expect, it } from 'vitest'
import type { WorkspaceData } from '@/types'
import { encrypt } from './crypto'
import { decodeWorkspaceRecord } from './storage'

async function testKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

describe('workspace storage decoding', () => {
  const workspace: WorkspaceData = {
    pages: {},
    rootPages: [],
    tabs: [],
    activeTabId: null,
  }

  it('decodes encrypted workspace records', async () => {
    const key = await testKey()
    const encrypted = await encrypt(key, JSON.stringify(workspace))

    await expect(decodeWorkspaceRecord({ encrypted }, key)).resolves.toEqual(workspace)
  })

  it('keeps backward compatibility with plaintext workspace records', async () => {
    const key = await testKey()

    await expect(decodeWorkspaceRecord(workspace, key)).resolves.toEqual(workspace)
  })
})
