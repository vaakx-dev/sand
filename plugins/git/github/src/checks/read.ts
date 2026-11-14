import type { Rest } from '../api/client'

export type CheckState = 'running' | 'passed' | 'failed'

export type CheckOutcome = 'passed' | 'failed'

export interface Check {
  name: string
  url: string
  state: CheckState
}

interface Run {
  name: string
  status: string
  conclusion: string | null
  html_url: string | null
  details_url: string | null
}

interface Status {
  context: string
  state: string
  target_url: string | null
}

const passing = new Set(['success', 'neutral', 'skipped'])

const statusStates: Record<string, CheckState> = { pending: 'running', success: 'passed', failure: 'failed', error: 'failed' }

const runState = (run: Run): CheckState => {
  if (run.status !== 'completed') return 'running'
  return passing.has(run.conclusion ?? '') ? 'passed' : 'failed'
}

export const readChecks = async (client: Rest, repo: string, sha: string): Promise<Check[]> => {
  const [runs, combined] = await Promise.all([
    client.rest<{ check_runs: Run[] }>('GET', `${repo}/commits/${sha}/check-runs?per_page=100`),
    client.rest<{ statuses: Status[] }>('GET', `${repo}/commits/${sha}/status?per_page=100`),
  ])
  return [
    ...runs.check_runs.map(run => ({ name: run.name, url: run.html_url ?? run.details_url ?? '', state: runState(run) })),
    ...combined.statuses.map(status => ({ name: status.context, url: status.target_url ?? '', state: statusStates[status.state] ?? 'running' })),
  ]
}
