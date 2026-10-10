import type { Check } from './types'

export type Outcome = 'passed' | 'failed' | 'cancelled' | 'pending'

const failing = new Set(['FAILURE', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR'])
const cancelled = new Set(['CANCELLED', 'STALE'])

const value = (check: Check) => {
  if (check.__typename === 'StatusContext') return check.state
  return check.status === 'COMPLETED' ? check.conclusion : undefined
}

export const outcome = (check: Check): Outcome => {
  const result = value(check)
  if (!result || result === 'PENDING' || result === 'EXPECTED') return 'pending'
  if (cancelled.has(result)) return 'cancelled'
  return failing.has(result) ? 'failed' : 'passed'
}

export const checkName = (check: Check) => check.name ?? check.context ?? 'check'

export const checkUrl = (check: Check) => check.detailsUrl ?? check.targetUrl

export const byOutcome = (checks: Check[], wanted: Outcome) => checks.filter(check => outcome(check) === wanted)
