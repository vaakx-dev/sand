import type { Dispose } from 'drydock'

export const createListeners = <T>() => {
  const listeners = new Set<(value: T) => void>()
  const add = (listener: (value: T) => void): Dispose => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const emit = (value: T) => {
    for (const listener of listeners) listener(value)
  }
  return { add, emit }
}
