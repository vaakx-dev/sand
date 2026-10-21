import type { HostHealth } from '@sand/host-health/contract'
import { errorMessage } from '../../text/error'
import { isHealthy, type HealthOutcome } from './check'

const interval = 1000
const settle = 10_000

const isBad = (report: HostHealth) =>
  report.runtime === 'failed' || (report.runtime === 'ready' && (!report.web || report.failedPlugins.length > 0))

export const waitHealthy = async (read: () => Promise<HostHealth>, { timeout = 120_000 } = {}): Promise<HealthOutcome> => {
  const deadline = Date.now() + timeout
  let last: HealthOutcome = { ok: false, error: 'sand did not answer' }
  let badSince: number | undefined
  while (true) {
    try {
      const report = await read()
      if (isHealthy(report)) return { ok: true, report }
      last = { ok: false, report }
      badSince = isBad(report) ? (badSince ?? Date.now()) : undefined
    } catch (error) {
      last = { ok: false, report: last.report, error: errorMessage(error) }
    }
    if (badSince !== undefined && Date.now() - badSince >= settle) return last
    if (Date.now() >= deadline) return last
    await Bun.sleep(Math.min(interval, Math.max(0, deadline - Date.now())))
  }
}
