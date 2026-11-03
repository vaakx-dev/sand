import type { GitRunner } from '@sand/git/contract'
import { currentBranch, refExists } from '../repo/refs'

export interface Base {
  start: string
  name: string
}

const fetchMs = 20_000

const fromRef = async (git: GitRunner, main: string, from: string): Promise<Base> => {
  for (const [ref, name] of [
    [`refs/heads/${from}`, from],
    [`refs/remotes/origin/${from}`, `origin/${from}`],
    [from, from],
  ] as const) {
    if (await refExists(git, main, ref)) return { start: ref, name }
  }
  throw new Error(`There's no branch or commit called ${from}.`)
}

const freshRef = async (git: GitRunner, main: string, branch: string): Promise<Base> => {
  const fetched = await git.run(main, ['fetch', '--quiet', '--no-tags', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`], { timeoutMs: fetchMs })
  if (fetched.code === 0) return { start: `refs/remotes/origin/${branch}`, name: `origin/${branch}` }
  if (await refExists(git, main, `refs/heads/${branch}`)) return { start: `refs/heads/${branch}`, name: branch }
  throw new Error(`Couldn't fetch origin/${branch} and there's no local ${branch} branch to start the worktree from.`)
}

export const resolveBase = async (git: GitRunner, main: string, defaultBranch: string | undefined, from?: string): Promise<Base> => {
  if (from) return fromRef(git, main, from)
  const branch = defaultBranch ?? (await currentBranch(git, main))
  return branch ? freshRef(git, main, branch) : { start: 'HEAD', name: 'HEAD' }
}
