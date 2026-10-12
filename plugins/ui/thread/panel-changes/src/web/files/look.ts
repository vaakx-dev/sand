import { derive } from '@vaakx-dev/vrui'
import type { FileChange } from '../../changes/collect'
import { quoteText, selectedLines, selectionLabel } from '../diff/quote'
import type { DiffView } from '../diff/view'
import type { Display } from '../display'
import type { ChangesState } from '../view'
import { shapeOf } from './viewed'

export const lookOf = (file: FileChange, state: ChangesState, display: Display) => ({
  shape: shapeOf(file),
  starts: file.hunks.map(hunk => hunk.start),
  split: display.split(),
  wrap: display.wrap(),
  compact: display.compact(),
  open: display.opened.get()[file.key] ?? [],
  colors: Boolean(state.highlight.get()),
})

export type Look = ReturnType<typeof lookOf>

const languageOf = (path: string) => path.slice(path.lastIndexOf('.') + 1).toLowerCase()

const selectionOf = (file: FileChange, display: Display) =>
  derive(() => {
    const selection = display.selection.get()
    if (selection?.key !== file.key) return undefined
    const { from, to } = selection
    return { from, to, label: selectionLabel(selectedLines(file, from, to)) }
  })

export const diffViewOf = (file: FileChange, look: Look, state: ChangesState, display: Display): DiffView => {
  const selected = selectionOf(file, display)
  const highlighter = state.highlight.get()
  const language = languageOf(file.path)
  const clear = () => display.selection.set(undefined)
  return {
    split: look.split,
    wrap: look.wrap,
    compact: look.compact,
    open: new Set(look.open),
    selected: () => selected.get(),
    highlight: highlighter ? code => highlighter(code, language) : code => [code],
    expand: id => display.expand(file.key, id),
    select: at => display.select(file.key, at),
    quote: () => {
      const range = selected.get()
      if (range) state.quote(quoteText(file, selectedLines(file, range.from, range.to)))
      clear()
    },
    clear,
  }
}
