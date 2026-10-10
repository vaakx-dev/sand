import type { Store } from '../threads/store'

export const devicesOf = (store: Store) => {
  const devices = new Set<string>()
  for (const thread of store.threads.values()) if (thread.device) devices.add(thread.device)
  return devices
}

export const dropRemote = (store: Store, device: string) => {
  for (const thread of [...store.threads.values()]) if (thread.device === device) store.remove(thread.id)
  store.synced.delete(device)
}
