import type { WireEvent } from '@sand/host-hub/contract'
import type { WireListen, WireListener } from '../contract'
import type { Heard } from '../integrations/socket'

interface Entry {
  listener: WireListener<unknown>
  remotes: boolean
}

export const createListeners = () => {
  const listeners = new Map<string, Set<Entry>>()

  const on = <P>(event: WireEvent<P>, listener: WireListener<P>, options?: WireListen) => {
    const entry: Entry = { listener: listener as WireListener<unknown>, remotes: !!options?.remotes }
    const set = listeners.get(event.id) ?? new Set()
    listeners.set(event.id, set.add(entry))
    return () => void set.delete(entry)
  }

  const dispatch = (heard: Heard, device: string, remote: boolean) => {
    for (const entry of [...(listeners.get(heard.name) ?? [])]) {
      if (remote && !entry.remotes) continue
      try {
        entry.listener(heard.payload, device)
      } catch (error) {
        console.error(`A listener for ${heard.name} failed`, error)
      }
    }
  }

  return { on, dispatch }
}

export type Listeners = ReturnType<typeof createListeners>
