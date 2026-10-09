import type { SyncPick, SyncResolved } from '../contract'
import { checkoutPaths, removeFiles } from '../apply/files'
import { hiddenGit, type Hidden } from '../folder/hidden'
import { readState, writeState } from '../folder/store'
import { treeOf } from '../snapshot/tree'
import { remaining } from './remaining'
import { finalise, settle } from './settle'

const hasFile = async (hidden: Hidden, tree: string, path: string) => (await hiddenGit(hidden, ['cat-file', '-e', `${tree}:${path}`])).code === 0

const pickFiles = async (hidden: Hidden, commit: string, paths: string[]) => {
  const tree = await treeOf(hidden, commit)
  const present = await Promise.all(paths.map(path => hasFile(hidden, tree, path)))
  await checkoutPaths(hidden, tree, paths.filter((_, index) => present[index]))
  await removeFiles(hidden, paths.filter((_, index) => !present[index]))
}

export const resolveConflicts = async (hidden: Hidden, picks: Record<string, SyncPick>): Promise<SyncResolved> => {
  const settled = await settle(hidden)
  if (!settled.pending || !settled.ours) return { head: settled.head, remaining: [] }
  const chosen = Object.entries(picks).filter(([path, pick]) => settled.conflicts.includes(path) && (pick === 'ours' || pick === 'theirs'))
  const picked = new Set(chosen.map(([path]) => path))
  await pickFiles(hidden, settled.ours, chosen.filter(([, pick]) => pick === 'ours').map(([path]) => path))
  await pickFiles(hidden, settled.pending, chosen.filter(([, pick]) => pick === 'theirs').map(([path]) => path))
  const unmarked = Object.fromEntries(Object.entries(settled.unmarked).filter(([path]) => !picked.has(path)))
  const left = settled.conflicts.filter(path => !picked.has(path))
  const state = { ...settled, conflicts: left, unmarked }
  await writeState(hidden, state)
  const open = await remaining(hidden, state)
  if (open.length === 0) return { head: await finalise(hidden, state), remaining: [] }
  await writeState(hidden, { ...state, conflicts: open })
  return { head: (await readState(hidden)).head, remaining: open }
}
