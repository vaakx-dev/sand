import type { SyncApplied, SyncMode } from '@sand/protocol'
import { mkdir } from 'node:fs/promises'
import { stamps } from '../conflicts/remaining'
import { settle } from '../conflicts/settle'
import { hiddenGit, type Hidden } from '../folder/hidden'
import { emptyState, readState, writeState } from '../folder/store'
import { snapshot } from '../snapshot/snapshot'
import { commitTree, treeOf } from '../snapshot/tree'
import { writeDiff } from './files'
import { isAncestor, threeWay } from './merge'

const requireCommit = async (hidden: Hidden, commit: string) => {
  if ((await hiddenGit(hidden, ['cat-file', '-e', `${commit}^{commit}`])).code !== 0) throw new Error('That snapshot has not been received')
}

const replace = async (hidden: Hidden, commit: string): Promise<SyncApplied> => {
  await mkdir(hidden.folder, { recursive: true })
  await writeState(hidden, { ...emptyState(), head: (await readState(hidden)).head })
  const current = await snapshot(hidden)
  const changed = await writeDiff(hidden, await treeOf(hidden, current), await treeOf(hidden, commit))
  await writeState(hidden, { ...emptyState(), head: commit })
  return { result: current === commit ? 'current' : 'applied', head: commit, conflicts: [], changed }
}

const fastForward = async (hidden: Hidden, current: string, commit: string): Promise<SyncApplied> => {
  const changed = await writeDiff(hidden, await treeOf(hidden, current), await treeOf(hidden, commit))
  await writeState(hidden, { ...emptyState(), head: commit })
  return { result: 'applied', head: commit, conflicts: [], changed }
}

const merge = async (hidden: Hidden, current: string, commit: string): Promise<SyncApplied> => {
  const merged = await threeWay(hidden, current, commit)
  const changed = await writeDiff(hidden, await treeOf(hidden, current), merged.tree)
  if (merged.conflicts.length === 0) {
    const head = await commitTree(hidden, merged.tree, [current, commit], 'sand sync merge')
    await writeState(hidden, { ...emptyState(), head })
    return { result: 'merged', head, conflicts: [], changed }
  }
  const unmarked = await stamps(hidden, merged.conflicts)
  await writeState(hidden, { head: current, pending: commit, ours: current, conflicts: merged.conflicts, unmarked })
  return { result: 'conflicts', head: current, conflicts: merged.conflicts, changed }
}

export const applySnapshot = async (hidden: Hidden, commit: string, mode: SyncMode = 'merge'): Promise<SyncApplied> => {
  await requireCommit(hidden, commit)
  if (mode === 'replace') return replace(hidden, commit)
  const settled = await settle(hidden)
  if (settled.pending) throw new Error('Resolve the conflicts in this folder first')
  const current = await snapshot(hidden)
  if (current === commit || (await isAncestor(hidden, commit, current))) return { result: 'current', head: current, conflicts: [], changed: 0 }
  if (await isAncestor(hidden, current, commit)) return fastForward(hidden, current, commit)
  return merge(hidden, current, commit)
}
