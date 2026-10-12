import { isRecord } from '@sand/kit'

const persistAsked = 'sand.persist'

export const loadRecord = (key: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export const saveJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const askPersistence = () => {
  try {
    if (localStorage.getItem(persistAsked)) return
    localStorage.setItem(persistAsked, '1')
    void navigator.storage?.persist?.().catch(() => {})
  } catch {}
}
