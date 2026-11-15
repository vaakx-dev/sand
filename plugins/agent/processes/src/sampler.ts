import { busyShare, cpuTimes, memory } from '@sand/machine'
import type { Context } from 'drydock'
import { type Bar, type Bars, machineRead, type MachineReading, type Range } from './contract'

const HISTORY_MS = 60 * 60 * 1000
const BARS = 30
const RANGE_MS: Record<Range, number> = { '5m': 5 * 60 * 1000, '15m': 15 * 60 * 1000, '1h': HISTORY_MS }

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

const barOf = (readings: MachineReading[]): Bar | null =>
  readings.length ? { cpu: average(readings.map(reading => reading.cpu)), memory: average(readings.map(reading => 1 - reading.freeBytes / reading.totalBytes)) } : null

export const startSampler = (ctx: Context, everyMs: number) => {
  let history: MachineReading[] = []
  let times = cpuTimes()

  const read = async (): Promise<MachineReading> => {
    const { totalBytes, freeBytes } = await memory()
    const now = cpuTimes()
    const cpu = busyShare(times, now)
    times = now
    return { at: Date.now(), totalBytes, freeBytes, cpu, cores: now.cores }
  }

  const remember = (reading: MachineReading) => {
    history = [...history.filter(old => old.at > reading.at - HISTORY_MS), reading]
    ctx.emit(machineRead, reading)
  }

  ctx.effect(() => {
    let stopped = false
    const tick = () =>
      read()
        .then(remember)
        .catch(error => ctx.report(error))
        .finally(() => {
          if (!stopped) timer = setTimeout(tick, everyMs)
        })
    let timer = setTimeout(tick, everyMs)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  })

  return {
    latest: async () => history.at(-1) ?? (await read()),
    bars(range: Range): Bars {
      const width = RANGE_MS[range] / BARS
      const windowOf = (at: number) => Math.floor(at / width)
      const byWindow = Map.groupBy(history, reading => windowOf(reading.at))
      const end = windowOf(Date.now())
      return { end, values: Array.from({ length: BARS }, (_, offset) => barOf(byWindow.get(end - BARS + 1 + offset) ?? [])) }
    },
  }
}

export type Sampler = ReturnType<typeof startSampler>
