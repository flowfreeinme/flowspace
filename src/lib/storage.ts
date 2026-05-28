import type { WorkspaceData, Tab } from '@/types'
import { supabase } from './supabase'
import { encrypt, decrypt } from './crypto'

const TAB_STATE_KEY = 'flowspace_tab_state'

export async function saveTabState(tabs: Tab[], activeTabId: string | null, key: CryptoKey): Promise<void> {
  try {
    const encrypted = await encrypt(key, JSON.stringify({ tabs, activeTabId }))
    localStorage.setItem(TAB_STATE_KEY, encrypted)
  } catch {}
}

export async function loadTabState(key: CryptoKey): Promise<{ tabs: Tab[]; activeTabId: string | null } | null> {
  try {
    const raw = localStorage.getItem(TAB_STATE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(await decrypt(key, raw))
    } catch {
      // pre-encryption plaintext fallback — re-saved encrypted on next persist()
      return JSON.parse(raw)
    }
  } catch { return null }
}

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<Record<string, unknown> | WorkspaceData | null>
      saveData: (data: string) => Promise<{ ok: boolean }>
      isElectron: boolean
    }
  }
}

export async function decodeWorkspaceRecord(
  raw: Record<string, unknown> | WorkspaceData,
  key: CryptoKey,
): Promise<WorkspaceData> {
  if ('encrypted' in raw && typeof raw.encrypted === 'string') {
    const json = await decrypt(key, raw.encrypted)
    return JSON.parse(json) as WorkspaceData
  }

  // pre-encryption plaintext row/file — re-saved encrypted on next persist()
  return raw as unknown as WorkspaceData
}

export async function loadWorkspace(key: CryptoKey): Promise<WorkspaceData | null> {
  const { data, error } = await supabase.rpc('load_workspace')
  if (!error && data) {
    return decodeWorkspaceRecord(data as Record<string, unknown>, key)
  }
  if (window.electronAPI) {
    const local = await window.electronAPI.loadData()
    return local ? decodeWorkspaceRecord(local, key) : null
  }
  return null
}

export async function saveWorkspace(workspace: WorkspaceData, key: CryptoKey): Promise<void> {
  const json = JSON.stringify(workspace)
  const encrypted = await encrypt(key, json)
  await supabase.rpc('save_workspace', {
    p_data: { encrypted } as unknown as Record<string, unknown>,
  })
  if (window.electronAPI) {
    await window.electronAPI.saveData(JSON.stringify({ encrypted }))
  }
}
