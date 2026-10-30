import type { WireListen, WireListener } from '@sand/devices-contract'
import type { WireEvent } from '@sand/host-hub/contract'

interface Entry {
  listener: WireListener<unknown>
  everyPc: boolean
}

export const wireListeners = () => {
  const byEvent = new Map<string, Set<Entry>>()

  const on = <P>(event: WireEvent<P>, listener: WireListener<P>, options?: WireListen) => {
    const entry: Entry = { listener: listener as WireListener<unknown>, everyPc: options?.from === 'all' }
    const entries = byEvent.get(event.id) ?? new Set()
    byEvent.set(event.id, entries.add(entry))
    return () => void entries.delete(entry)
  }

  const dispatch = (name: string, payload: unknown, pc: string, home: boolean) => {
    for (const entry of [...(byEvent.get(name) ?? [])]) {
      if (!home && !entry.everyPc) continue
      try {
        entry.listener(payload, pc)
      } catch (error) {
        console.error(`A listener for ${name} failed`, error)
      }
    }
  }

  return { on, dispatch }
}

export type WireListeners = ReturnType<typeof wireListeners>
