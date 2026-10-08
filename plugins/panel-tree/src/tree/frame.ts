import type { Filter } from './filter'
import { ancestors, growForest, type Forest, type TreeNode } from './forest'
import { layout, rowIndex, type Row } from './layout'

export interface TreeState {
  selected: string | null
  filter: Filter
  search: string
  folded: Set<string>
}

export interface TreeFrame {
  rows: Row[]
  index: number
  forest: Forest
  state: TreeState
}

export const treeFrame = (nodes: Map<string, TreeNode>, head: string | null, state: TreeState): TreeFrame => {
  const forest = growForest(nodes, head, state.filter, state.search)
  const rows = layout(forest, state.folded)
  return { forest, rows, index: rowIndex(rows, ancestors(nodes, state.selected)), state }
}
