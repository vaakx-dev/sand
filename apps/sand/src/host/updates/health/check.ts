import type { HealthOutcome, HealthReport } from './types'

export const isHealthy = (report: HealthReport) =>
  report.runtime === 'ready' && report.web && !report.failedPlugins.length

export const healthBuild = (report: HealthReport) => report.build?.id

const withDetail = (text: string, detail?: string) => (detail ? `${text}: ${detail}` : text)

const runtimeLine = (report: HealthReport) => {
  if (report.runtime === 'failed') return withDetail('The sand runtime failed', report.error)
  if (report.runtime !== 'ready') return `The sand runtime is not ready (${report.runtime})`
}

const reportLines = (report: HealthReport) => [
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
