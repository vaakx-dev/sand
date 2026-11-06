import type { Wire } from '@sand/devices-contract'
import { uiWatch } from '@sand/server/contract'
import type { Dispose } from 'drydock'
import type { Store } from './store'

export const threadWatches = (wire: Wire, store: Store, load: (id: string) => void) => {
  const send = (device: string) => void wire.call(uiWatch, { sessions: store.watchedOn(device) }, device).catch(() => {})

  const watch = (id: string): Dispose => {
    const count = store.watched.get(id) ?? 0
    store.watched.set(id, count + 1)
    if (!count) send(store.deviceOf(id))
    if (!store.threads.get(id)?.loaded) load(id)
    let done = false
    return () => {
      if (done) return
      done = true
      const left = (store.watched.get(id) ?? 1) - 1
      if (left > 0) return void store.watched.set(id, left)
      store.watched.delete(id)
      send(store.deviceOf(id))
    }
  }

  const greeted = (device: string) => {
    const ids = store.watchedOn(device)
    if (ids.length) send(device)
    for (const id of ids) if (id !== store.current) load(id)
  }

  return { watch, greeted }
}
