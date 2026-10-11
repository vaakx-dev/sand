import type { Hidden } from '../folder/hidden'
import { readState, writeHead } from '../folder/store'
import { commitTree, folderTree, treeOf } from './tree'

export const snapshot = async (hidden: Hidden) => {
  const tree = await folderTree(hidden)
  const state = await readState(hidden)
  if (state.head && !state.pending && (await treeOf(hidden, state.head).catch(() => '')) === tree) return state.head
  const head = await commitTree(hidden, tree, [state.head, state.pending])
  await writeHead(hidden, head)
  return head
}
