import { describe, expect, it } from 'vitest'
import { normalizeFolderName } from './folderNaming'

describe('folder naming', () => {
  it('trims folder names and falls back to the default when empty', () => {
    expect(normalizeFolderName(' Client Work ')).toBe('Client Work')
    expect(normalizeFolderName('   ')).toBe('New folder')
  })
})
