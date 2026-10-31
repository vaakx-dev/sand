import type { DiffList } from '@sand/git-diff/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { uncounted } from '../model/list'
import type { ViewParts } from './parts'

const noteText = (list: DiffList) => {
  const count = list.files.length
  return uncounted(list) ? `Showing the first ${count} files` : `Showing ${count} of ${list.total} files`
}

export const truncatedNote = ({ model }: ViewParts) => {
  const cut = derive(() => {
    const state = model.list.get()
    return state.kind === 'ready' && state.list.truncated ? state.list : undefined
  })
  return dynamicChild(cut, now => now && div({ class: 'border-b border-neutral-800 px-4 py-2 text-xs text-neutral-500' }, noteText(now)))
}
