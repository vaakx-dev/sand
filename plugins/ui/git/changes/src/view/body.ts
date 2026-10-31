import type { DiffFile } from '@sand/git-diff/contract'
import { derive, div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { PatchState } from '../model/patches'
import { highlighter } from '../patch/highlight'
import { pickHandlers } from './picking'
import type { ViewParts } from './parts'
import { splitRows, unifiedRows, type IsPicked } from './rows'

const note = ({ kit }: ViewParts, text: string) => div({ class: 'px-4' }, kit.emptyState({ text }))

const linesView = (parts: ViewParts, path: string, state: Extract<PatchState, { kind: 'ready' }>) => {
  const { kit, model, layout, markdown } = parts
  const range = model.selection.of(path)
  const picked: IsPicked = index => () => {
    const now = range.get()
    return now !== undefined && index >= now.from && index <= now.to
  }
  const look = derive(() => ({ view: layout.view.get(), row: { kit, picked, highlight: highlighter(markdown.get(), path) } }))
  const { lines } = state.rows
  return div(
    {
      class: 'font-mono text-xs',
      ...pickHandlers({
        pick: (index, extend) => model.selection.pick(path, lines, index, extend),
        drag: index => model.selection.drag(path, index),
      }),
    },
    dynamicChild(look, ({ view, row }) => (view === 'split' ? splitRows(row, state.rows) : unifiedRows(row, state.rows))),
  )
}

const readyView = (parts: ViewParts, file: DiffFile, state: Extract<PatchState, { kind: 'ready' }>) => {
  if (state.patch.tooLarge) return note(parts, 'This diff is too large to show')
  if (state.patch.binary) return note(parts, 'Binary file')
  if (!state.rows.lines.length) return note(parts, file.from ? 'Renamed without changes' : 'No line changes')
  return linesView(parts, file.path, state)
}

export const fileBody = (parts: ViewParts, file: Sig<DiffFile>, state: Sig<PatchState>, retry: () => void) =>
  dynamicChild(state, now => {
    if (file.get().binary) return note(parts, 'Binary file')
    if (now.kind === 'ready') return readyView(parts, file.get(), now)
    if (now.kind === 'error') return div({ class: 'px-4' }, parts.kit.errorState({ text: `Couldn't load this diff: ${now.message}`, retry }))
    return div({ class: 'px-4' }, parts.kit.loadingState())
  })
