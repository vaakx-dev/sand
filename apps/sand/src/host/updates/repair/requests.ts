import type { Hub, PcRepairResult } from '@sand/protocol'
import type { Dispose } from 'drydock'
import { type RepairDeps, repairPeer } from './peer'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const repairs = (deps: RepairDeps) => {
  const running = new Map<string, Promise<PcRepairResult>>()
  const last = new Map<string, PcRepairResult>()

  const start = (device: string) => {
    last.delete(device)
    const repair = repairPeer(deps, device)
      .then(result => {
        last.set(device, result)
        return result
      })
      .finally(() => running.delete(device))
    running.set(device, repair)
    return repair
  }

  return (device: string, resume: boolean) => {
    const known = running.get(device) ?? (resume ? last.get(device) : undefined)
    if (known) return known
    if (resume) throw new Error('No repair of that PC is running')
    return start(device)
  }
}

export const repairRequests = (hub: Pick<Hub, 'handle'>, deps: RepairDeps): (() => Dispose)[] => {
  const repair = repairs(deps)
  return [
    () =>
      hub.handle('pc.repair', ({ device, resume }) => {
        if (!text(device)) throw new Error('pc.repair needs a device id')
        return repair(device, resume === true)
      }),
  ]
}
