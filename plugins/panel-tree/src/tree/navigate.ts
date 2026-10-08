import type { TreeState } from './frame'

export const toggleFold = (state: TreeState, id: string): Partial<TreeState> => {
  const folded = new Set(state.folded)
  if (!folded.delete(id)) folded.add(id)
  return { folded, selected: id }
}
