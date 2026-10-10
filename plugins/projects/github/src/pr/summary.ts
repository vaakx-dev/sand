import type { PrState, PrSummary } from '../contract'
import { byOutcome, checkName } from './checks'
import { repoOf, viewPr } from './fetch'
import { unresolvedThreads } from './threads'

const timeoutMs = 30000

const states: Record<string, PrState> = { OPEN: 'open', MERGED: 'merged', CLOSED: 'closed' }

const noPr = (error: unknown) => error instanceof Error && /no (open )?pull requests? found/i.test(error.message)

export const prSummary = async (cwd: string): Promise<PrSummary | null> => {
  const signal = AbortSignal.timeout(timeoutMs)
  const view = await viewPr(undefined, cwd, signal).catch(error => {
    if (noPr(error)) return null
    throw error
  })
  if (!view) return null
  const state = states[view.state] ?? 'closed'
  const threads = state === 'open' ? await unresolvedThreads(repoOf(view.url), view.number, cwd, signal).catch(() => []) : []
  const checks = view.statusCheckRollup
  return {
    number: view.number,
    title: view.title,
    url: view.url,
    state,
    draft: view.isDraft,
    branch: view.headRefName,
    base: view.baseRefName,
    checks: { passed: byOutcome(checks, 'passed').length, failed: byOutcome(checks, 'failed').length, pending: byOutcome(checks, 'pending').length },
    failing: [...new Set(byOutcome(checks, 'failed').map(checkName))],
    unresolved: threads.length,
    mergeState: view.mergeStateStatus,
    review: view.reviewDecision,
  }
}
