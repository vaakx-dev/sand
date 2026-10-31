import type { GitRunner } from '@sand/git/contract'
import type { PlannedStep } from '../records/schema'
import { currentBranch, hasOrigin, refExists } from '../repo/refs'
import { doneStep } from '../setup/state'

const fetchCapMs = 15_000

export interface Base {
  start: string
  name: string
  steps: PlannedStep[]
}

const fromRef = async (git: GitRunner, main: string, from: string): Promise<Base> => {
  for (const [ref, name] of [
    [`refs/heads/${from}`, from],
    [`refs/remotes/origin/${from}`, `origin/${from}`],
    [from, from],
  ] as const) {
    if (await refExists(git, main, ref)) return { start: ref, name, steps: [] }
  }
  throw new Error(`There's no branch or commit called ${from}.`)
}

const localRef = async (git: GitRunner, main: string, branch: string): Promise<Base> => {
  if (await refExists(git, main, `refs/heads/${branch}`)) return { start: `refs/heads/${branch}`, name: branch, steps: [] }
  if (await refExists(git, main, `refs/remotes/origin/${branch}`)) return { start: `refs/remotes/origin/${branch}`, name: `origin/${branch}`, steps: [] }
  throw new Error(`There's no ${branch} branch to start the worktree from.`)
}

const fetchFailure = (out: string, started: number) =>
  Date.now() - started >= fetchCapMs ? `took longer than ${fetchCapMs / 1000} seconds` : out.trim().split(/\r?\n/).at(-1) || 'git fetch failed'

const fetched = async (git: GitRunner, main: string, branch: string): Promise<Base> => {
  const label = `Fetch origin/${branch}`
  const started = Date.now()
  const result = await git.run(main, ['fetch', '--quiet', '--no-tags', 'origin', branch], { timeoutMs: fetchCapMs })
  if (result.code === 0 && (await refExists(git, main, `refs/remotes/origin/${branch}`))) {
    return { start: `refs/remotes/origin/${branch}`, name: `origin/${branch}`, steps: [doneStep('fetch', label)] }
  }
  const local = await localRef(git, main, branch)
  const why = result.code === 0 ? `origin has no ${branch}` : fetchFailure(`${result.out}\n${result.err}`, started)
  return { ...local, steps: [{ id: 'fetch', label, state: 'skip', output: `Couldn't fetch (${why}), so it started from ${local.name}.` }] }
}

export const resolveBase = async (git: GitRunner, main: string, defaultBranch: string | undefined, from?: string): Promise<Base> => {
  if (from) return fromRef(git, main, from)
  const branch = defaultBranch ?? (await currentBranch(git, main))
  if (!branch) return { start: 'HEAD', name: 'HEAD', steps: [] }
  return (await hasOrigin(git, main)) ? fetched(git, main, branch) : localRef(git, main, branch)
}
