import type { DiffFile, DiffList } from '@sand/git-diff/contract'
import { derive, div, dynamicChild, list, type Sig } from '@vaakx-dev/vrui'
import { uncounted } from '../model/list'
import type { ViewParts } from './parts'

const fileRow = ({ kit, sections, diff }: ViewParts, file: Sig<DiffFile>) =>
  kit.listRow({
    lead: kit.fileKindMark(() => file.get().kind),
    title: diff.pathLabel(() => file.get().path),
    trail: kit.lineStat(
      () => file.get().add,
      () => file.get().del,
    ),
    onClick: () => sections.jump(file.get().path),
  })

const noteText = (list: DiffList) => {
  const count = list.files.length
  return uncounted(list) ? `Showing the first ${count} files` : `Showing ${count} of ${list.total} files`
}

const truncatedNote = ({ model }: ViewParts) => {
  const cut = derive(() => {
    const state = model.list.get()
    return state.kind === 'ready' && state.list.truncated ? state.list : undefined
  })
  return dynamicChild(cut, now => now && div({ class: 'px-2 py-1 text-xs text-neutral-500' }, noteText(now)))
}

export const fileList = (parts: ViewParts) =>
  div(
    { class: 'border-b border-neutral-800 px-2 pb-2' },
    list(parts.model.files, file => file.path, file => fileRow(parts, file)),
    truncatedNote(parts),
  )
