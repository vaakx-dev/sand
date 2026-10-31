import { gitMaybe } from '../run/run'
import type { GitBranch, GitBranches } from '../contract'
import { readDefaultBranch } from '../status/default-branch'
import { readLayout } from '../status/layout'
import { readWorktrees } from '../status/worktrees'
import { matches, rank } from './order'
import { parseRefs, type Ref } from './refs'

const defaultLimit = 100

const readRemotes = async (root: string) => (await gitMaybe(root, ['remote'], { read: true }))?.split(/\r?\n/).filter(Boolean) ?? []

const toBranches = (refs: Ref[], checkedOut: Map<string, string>, defaultBranch: string | undefined): GitBranch[] => {
  const local = new Set(refs.flatMap(ref => (ref.remote ? [] : [ref.name])))
  return refs
    .filter(ref => !ref.remote || !local.has(ref.name))
    .map(ref => ({
      name: ref.name,
      remote: ref.remote,
      current: ref.current,
      isDefault: ref.name === defaultBranch && (!ref.remote || ref.remote === 'origin'),
      worktree: ref.remote ? undefined : checkedOut.get(ref.name),
      updated: ref.updated,
    }))
}

export const listBranches = async (cwd: string, query = '', limit = defaultLimit): Promise<GitBranches> => {
  const layout = await readLayout(cwd)
  if (!layout) return { branches: [], total: 0 }
  const { root } = layout
  const [refs, remotes, worktrees, defaultBranch] = await Promise.all([
    gitMaybe(root, ['for-each-ref', '--format=%(refname)%00%(symref)%00%(HEAD)%00%(committerdate:unix)', 'refs/heads', 'refs/remotes'], { read: true }),
    readRemotes(root),
    readWorktrees(root),
    readDefaultBranch(root),
  ])
  const checkedOut = new Map(worktrees.flatMap(tree => (tree.branch ? [[tree.branch, tree.path] as const] : [])))
  const found = toBranches(parseRefs(refs ?? '', remotes), checkedOut, defaultBranch).filter(branch => matches(branch, query))
  return { branches: found.sort(rank).slice(0, limit), total: found.length }
}
