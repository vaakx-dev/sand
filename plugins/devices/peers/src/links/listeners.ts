import type { Dispose } from 'drydock'

export const createListeners = <A extends unknown[]>() => {
  const listeners = new Set<(...args: A) => void>()
  return {
    add(listener: (...args: A) => void): Dispose {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    emit(...args: A) {
      for (const listener of [...listeners]) listener(...args)
    },
  }
}

export type Listeners<A extends unknown[]> = ReturnType<typeof createListeners<A>>
