import { cpus } from 'node:os'

interface CpuTimes {
  busyMs: number
  totalMs: number
  cores: number
}

const cpuTimes = (): CpuTimes => {
  const all = cpus()
  const totals = all.map(({ times }) => ({ busy: times.user + times.nice + times.sys + times.irq, total: times.user + times.nice + times.sys + times.irq + times.idle }))
  return {
    busyMs: totals.reduce((sum, core) => sum + core.busy, 0),
    totalMs: totals.reduce((sum, core) => sum + core.total, 0),
    cores: all.length,
  }
}

const busyShare = (before: CpuTimes, after: CpuTimes) => {
  const total = after.totalMs - before.totalMs
  return total > 0 ? Math.min(1, Math.max(0, (after.busyMs - before.busyMs) / total)) : 0
}

export { busyShare, cpuTimes, type CpuTimes }
