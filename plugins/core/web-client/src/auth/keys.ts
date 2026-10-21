import { listen } from '@vaakx-dev/vrui'
import { isRecord } from '@sand/util'
import { loadRecord, saveJson } from '../integrations/storage'

interface HostKey {
  device: string
  key: string
}

const keysKey = 'sand.keys'

const isHostKey = (value: unknown): value is HostKey => isRecord(value) && typeof value.device === 'string' && typeof value.key === 'string'

const read = (): Record<string, HostKey> =>
  Object.fromEntries(Object.entries(loadRecord(keysKey)).filter((entry): entry is [string, HostKey] => isHostKey(entry[1])))

const write = (keys: Record<string, HostKey>) => saveJson(keysKey, keys)

export const hostKeys = {
  get: (host: string): HostKey | undefined => read()[host],
  set(host: string, value: HostKey) {
    write({ ...read(), [host]: value })
  },
  forget(host: string, key: string) {
    const keys = read()
    if (keys[host]?.key !== key) return
    delete keys[host]
    write(keys)
  },
  watch(changed: () => void) {
    return listen<StorageEvent>(window, 'storage', event => {
      if (event.key === keysKey || event.key === null) changed()
    })
  },
}
