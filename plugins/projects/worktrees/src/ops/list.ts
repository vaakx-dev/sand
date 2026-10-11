import type { WorktreeState } from '../contract'
import { samePath } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import { changedCount, localBranches, repoOf, type Repo } from '../git/repo'
import { readSetup } from '../setup/file'
import type { Ops } from './context'

const most = 30

const changedAt = async (path: string, repo: Repo, rootChanged: number) => {
  if (samePath(path, repo.root)) return rootChanged
  return existsSync(path) ? changedCount(path) : undefined
}

export const listState = async (ops: Ops, cwd: string): Promise<WorktreeState | null> => {
  if (!cwd || !existsSync(cwd)) return null
  const repo = await repoOf(cwd)
  if (!repo) return null
  const [changed, branches, setup] = await Promise.all([
    changedCount(repo.root),
    localBranches(repo.root),
    readSetup([repo.main, repo.root], ops.config.auto_settle),
  ])
  const worktrees = await Promise.all(
    repo.checkouts.slice(0, most).map(async checkout => {
      const count = await changedAt(checkout.path, repo, changed)
      return { ...checkout, main: samePath(checkout.path, repo.main), ...(count !== undefined && { changed: count }) }
    }),
  )
  const { root, main, name, branch, linked } = repo
  return { root, main, name, branch, changed, worktree: linked, worktrees, branches, setup }
}
