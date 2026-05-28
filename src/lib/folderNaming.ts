export function normalizeFolderName(value: string) {
  const trimmed = value.trim()
  return trimmed || 'New folder'
}
