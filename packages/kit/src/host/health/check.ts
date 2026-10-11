import type { HostHealth } from '@sand/protocol'

export interface HealthOutcome {
  ok: boolean
  report?: HostHealth
  error?: string
}

export const isHealthy = (report: HostHealth) => report.runtime === 'ready' && report.web && !report.failedPlugins.length

const withDetail = (text: string, detail?: string) => (detail ? `${text}: ${detail}` : text)

const runtimeLine = (report: HostHealth) => {
  if (report.runtime === 'failed') return withDetail('The sand runtime failed', report.error)
  if (report.runtime !== 'ready') return `The sand runtime is not ready (${report.runtime})`
}

const reportLines = (report: HostHealth) => [
  runtimeLine(report),
  ...report.failedPlugins.map(plugin => `The plugin ${plugin.id} failed: ${plugin.error}`),
  report.runtime === 'ready' && !report.web ? withDetail('The web page is not served', report.webError) : undefined,
]

export const healthText = (outcome: HealthOutcome, logLines = 20) => {
  const report = outcome.report
  const lines = report ? reportLines(report).filter((line): line is string => !!line) : []
  if (outcome.error) lines.push(outcome.error)
  const log = report?.log.slice(-logLines) ?? []
  if (log.length) lines.push('Last lines of server.log:', ...log)
  return lines.join('\n')
}
