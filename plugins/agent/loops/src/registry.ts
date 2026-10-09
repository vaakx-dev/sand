import type { Dispose } from 'drydock'
import type { LoopImpl, LoopInfo } from './contract'

export const createRegistry = () => {
  const loops = new Map<string, LoopImpl>()
  const quarantined = new Map<string, string>()

  const infoOf = ({ name, label, description, plugin }: LoopImpl): LoopInfo => {
    const reason = quarantined.get(name)
    return { name, label, description, ...(plugin && { plugin }), ...(reason && { quarantined: reason }) }
  }

  return {
    register(loop: LoopImpl): Dispose {
      loops.set(loop.name, loop)
      return () => {
        if (loops.get(loop.name) === loop) loops.delete(loop.name)
      }
    },
    list: () => [...loops.values()].map(infoOf),
    get: (name: string) => loops.get(name),
    usable: (name: string) => (quarantined.has(name) ? undefined : loops.get(name)),
    quarantine: (name: string, reason: string) => void quarantined.set(name, reason),
    quarantined: (name: string) => quarantined.get(name),
  }
}

export type Registry = ReturnType<typeof createRegistry>
