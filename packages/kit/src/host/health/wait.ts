import { isHealthy } from './check'
import type { HealthOutcome, HealthReport } from './types'

export interface WaitOptions {
  timeout?: number
  interval?: number
  settle?: number
}

const isBad = (report: HealthReport) =>
  report.runtime === 'failed' || (report.runtime === 'ready' && (!report.web || report.failedPlugins.length > 0))

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const waitHealthy = async (
  read: () => Promise<HealthReport>,
  { timeout = 120_000, interval = 1000, settle = 10_000 }: WaitOptions = {},
): Promise<HealthOutcome> => {
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
      last = { ok: false, report: last.report, error: message(error) }
    }
    if (badSince !== undefined && Date.now() - badSince >= settle) return last
    if (Date.now() >= deadline) return last
    await Bun.sleep(Math.min(interval, Math.max(0, deadline - Date.now())))
  }
}
