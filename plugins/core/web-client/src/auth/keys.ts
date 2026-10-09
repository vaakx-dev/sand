export interface HostKey {
  device: string
  key: string
}

const storageKey = 'sand.keys'

const valid = (value: unknown): value is HostKey =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as HostKey).device === 'string' &&
  typeof (value as HostKey).key === 'string'

const read = (): Record<string, HostKey> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => valid(value)))
  } catch {
    return {}
  }
}

const write = (keys: Record<string, HostKey>) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys))
  } catch {}
}

export const hostKeys = {
  get: (host: string): HostKey | undefined => read()[host],
  set(host: string, value: HostKey) {
    write({ ...read(), [host]: value })
  },
  forget(host: string, key?: string) {
    const keys = read()
    if (!keys[host] || (key !== undefined && keys[host].key !== key)) return
    delete keys[host]
    write(keys)
  },
  watch(changed: () => void) {
    const listener = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) changed()
    }
    addEventListener('storage', listener)
    return () => removeEventListener('storage', listener)
  },
}
