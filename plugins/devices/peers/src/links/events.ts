import type { WireEvent } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

type Listener = (payload: unknown, pc: string) => void

export const createEvents = () => {
  const byName = new Map<string, Set<Listener>>()

  return {
    emit(name: string, payload: unknown, pc: string) {
      for (const listener of [...(byName.get(name) ?? [])]) listener(payload, pc)
    },
    on<P>(event: WireEvent<P>, listener: (payload: P, pc: string) => void): Dispose {
      const listeners = byName.get(event.id) ?? new Set<Listener>()
      const added = listener as Listener
      listeners.add(added)
      byName.set(event.id, listeners)
      return () => {
        listeners.delete(added)
        if (!listeners.size) byName.delete(event.id)
      }
    },
  }
}

export type Events = ReturnType<typeof createEvents>
