const persistAsked = 'sand.persist'

export const loadRecord = (key: string): object => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export const saveJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const loadText = (key: string) => {
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

export const saveText = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export const askPersistence = () => {
  try {
    if (localStorage.getItem(persistAsked)) return
    localStorage.setItem(persistAsked, '1')
    void navigator.storage?.persist?.().catch(() => {})
  } catch {}
}
