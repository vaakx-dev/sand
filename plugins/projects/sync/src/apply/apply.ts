import type { SyncApplied, SyncMode } from '../contract'
import { mkdir } from 'node:fs/promises'
import { unmarkedStamps } from '../conflicts/remaining'
import { requireSettled } from '../conflicts/settle'
import type { Hidden } from '../folder/hidden'
import { readState, writeHead, writeState } from '../folder/store'
import { snapshot } from '../snapshot/snapshot'
import { commitTree, hasCommit, treeOf } from '../snapshot/tree'
import { writeDiff } from './files'
import { isAncestor, threeWay } from './merge'

const checkoutCommit = async (hidden: Hidden, current: string, commit: string) => {
  const changed = await writeDiff(hidden, await treeOf(hidden, current), await treeOf(hidden, commit))
  await writeHead(hidden, commit)
  return changed
}

const replace = async (hidden: Hidden, commit: string): Promise<SyncApplied> => {
  await mkdir(hidden.folder, { recursive: true })
  await writeHead(hidden, (await readState(hidden)).head)
  const current = await snapshot(hidden)
  const changed = await checkoutCommit(hidden, current, commit)
  return { result: current === commit ? 'current' : 'applied', head: commit, conflicts: [], changed }
}

const merge = async (hidden: Hidden, current: string, commit: string): Promise<SyncApplied> => {
  const merged = await threeWay(hidden, current, commit)
  const changed = await writeDiff(hidden, await treeOf(hidden, current), merged.tree)
  if (merged.conflicts.length === 0) {
    const head = await commitTree(hidden, merged.tree, [current, commit], 'sand sync merge')
    await writeHead(hidden, head)
    return { result: 'merged', head, conflicts: [], changed }
  }
  const unmarked = await unmarkedStamps(hidden, merged.conflicts)
  await writeState(hidden, { head: current, pending: commit, ours: current, conflicts: merged.conflicts, unmarked })
  return { result: 'conflicts', head: current, conflicts: merged.conflicts, changed }
}

export const applySnapshot = async (hidden: Hidden, commit: string, mode: SyncMode = 'merge'): Promise<SyncApplied> => {
  if (!(await hasCommit(hidden, commit))) throw new Error('That snapshot has not been received')
  if (mode === 'replace') return replace(hidden, commit)
  await requireSettled(hidden)
  const current = await snapshot(hidden)
  if (current === commit || (await isAncestor(hidden, commit, current))) return { result: 'current', head: current, conflicts: [], changed: 0 }
  if (await isAncestor(hidden, current, commit)) return { result: 'applied', head: commit, conflicts: [], changed: await checkoutCommit(hidden, current, commit) }
  return merge(hidden, current, commit)
}
