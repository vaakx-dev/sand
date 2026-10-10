import { listen } from '@sand/dom'
import { loadRecord, saveJson } from '../integrations/storage'

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

const read = (): Record<string, HostKey> => Object.fromEntries(Object.entries(loadRecord(storageKey)).filter(([, value]) => valid(value)))

const write = (keys: Record<string, HostKey>) => saveJson(storageKey, keys)

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
    return listen(window, 'storage', event => {
      if (event instanceof StorageEvent && (event.key === storageKey || event.key === null)) changed()
    })
  },
}
