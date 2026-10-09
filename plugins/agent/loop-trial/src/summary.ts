import type { TrialCheck, TrialReport } from './contract'

export const headline = (report: TrialReport) => {
  if (report.ok && report.applied) return 'Passed. Installed; run /reload to use it.'
  if (report.ok) return report.error ?? 'Passed. Not installed.'
  if (report.error) return `Failed: ${report.error} The installed plugin is unchanged.`
  return 'Failed. The installed plugin is unchanged.'
}

export const checkLine = (check: TrialCheck) => `${check.ok ? 'ok' : 'FAILED'}: ${check.name}${check.detail ? ` (${check.detail})` : ''}`

export const keptLine = (report: TrialReport) => (report.session ? `The trial thread ${report.session} was kept so you can look at it.` : undefined)

export const reportText = (report: TrialReport) =>
  [headline(report), ...report.checks.map(checkLine), keptLine(report)].filter(Boolean).join('\n')
