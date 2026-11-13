import { cpus } from 'node:os'
import { processes, type ProcessInfo } from '@sand/machine'

const WARM_FOR_MS = 15_000
const WARM_UP_MS = 1_000

interface Snapshot {
  at: number
  cpuByPid: Map<number, number>
}

export interface Measured {
  all: ProcessInfo[]
  cpuOf(entry: ProcessInfo): number
}

export const createMeter = () => {
  let last: Snapshot | undefined

  const snapshot = async () => {
    const all = await processes()
    const taken: Snapshot = { at: performance.now(), cpuByPid: new Map(all.map(entry => [entry.pid, entry.cpuMs])) }
    return { all, taken }
  }

  const warm = () => last !== undefined && performance.now() - last.at < WARM_FOR_MS

  const measure = async (): Promise<Measured> => {
    const before = last
    const { all, taken } = await snapshot()
    last = taken
    const spanMs = before ? (taken.at - before.at) * cpus().length : 0
    return {
      all,
      cpuOf: entry => (before && spanMs > 0 ? Math.max(0, entry.cpuMs - (before.cpuByPid.get(entry.pid) ?? 0)) / spanMs : 0),
    }
  }

  return {
    measure,
    async measureWarm() {
      if (!warm()) {
        await measure()
        await Bun.sleep(WARM_UP_MS)
      }
      return measure()
    },
  }
}

export type Meter = ReturnType<typeof createMeter>
