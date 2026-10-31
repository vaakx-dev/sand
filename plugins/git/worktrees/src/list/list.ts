import type { SessionSummary } from '@sand/chats/contract'
import { isWithin, samePath } from '@sand/util/fs'
import type { Worktree } from '../contract'
import type { WorktreeDeps } from '../deps'
import { parseWorktrees, type ListedWorktree } from '../repo/porcelain'
import { gitStep } from '../repo/run'
import { threads } from '../sessions/inside'
import { recordedWorktree } from './shape'

const homeOf = (session: SessionSummary, trees: ListedWorktree[]) =>
  trees.filter(tree => isWithin(session.cwd, tree.path)).sort((a, b) => b.path.length - a.path.length)[0]

const sessionsByTree = (all: SessionSummary[], trees: ListedWorktree[]) => {
  const found = new Map<ListedWorktree, string[]>()
  for (const session of all) {
    const tree = homeOf(session, trees)
    if (tree) found.set(tree, [...(found.get(tree) ?? []), session.id])
  }
  return found
}

const listedWorktree = (deps: WorktreeDeps, main: string, tree: ListedWorktree, sessions: string[]): Worktree => {
  const record = deps.store.get(tree.path)
  if (record && !record.removed) return { ...recordedWorktree(record, sessions), ...(tree.branch ? { branch: tree.branch } : {}), ...(tree.head ? { head: tree.head } : {}) }
  return {
    path: tree.path,
    main,
    ...(tree.branch ? { branch: tree.branch } : {}),
    ...(tree.head ? { head: tree.head } : {}),
    sand: false,
    sessions,
  }
}

export const listWorktrees = async (deps: WorktreeDeps, cwd: string): Promise<Worktree[]> => {
  const local = await deps.repos.local(cwd)
  if (!local.repo) return []
  await deps.store.ready()
  const out = await gitStep(deps.git, local.main, ['worktree', 'list', '--porcelain'], "Couldn't list worktrees", { read: true })
  const trees = parseWorktrees(out).filter(tree => !tree.bare)
  const found = sessionsByTree(threads(deps.sessions), trees)
  const live = trees.map(tree => listedWorktree(deps, local.main, tree, found.get(tree) ?? []))
  const unlisted = deps.store
    .all()
    .filter(record => samePath(record.main, local.main) && !trees.some(tree => samePath(tree.path, record.path)))
    .map(record => recordedWorktree(record, record.sessions))
  return [...live, ...unlisted]
}
