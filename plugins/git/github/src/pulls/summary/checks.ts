import type { PullChecks } from '../../contract'
import type { CheckCounts } from './query'

const passed = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED', 'STALE', 'COMPLETED'])
export const failedStates = new Set(['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE'])

export const noChecks: PullChecks = { state: 'none', passed: 0, failed: 0, pending: 0 }

export const countChecks = (counts: CheckCounts | undefined): PullChecks => {
  if (!counts) return noChecks
  const tally = { passed: 0, failed: 0, pending: 0 }
  for (const { state, count } of [...(counts.checkRunCountsByState ?? []), ...(counts.statusContextCountsByState ?? [])]) {
    if (passed.has(state)) tally.passed += count
    else if (failedStates.has(state)) tally.failed += count
    else tally.pending += count
  }
  const state = tally.failed ? 'fail' : tally.pending ? 'pending' : tally.passed ? 'pass' : 'none'
  return { state, ...tally }
}
