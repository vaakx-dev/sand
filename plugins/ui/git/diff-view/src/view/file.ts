import type { DiffPatch } from '@sand/git-diff/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, read, type Sig } from '@vaakx-dev/vrui'
import type { DiffFileOptions, DiffLine } from '../contract'
import { highlighter } from '../patch/highlight'
import { patchRows, type PatchRows } from '../patch/rows'
import type { LinePicker } from '../select/picker'
import { pickHandlers } from '../select/picking'
import { inset } from './inset'
import { splitRows, unifiedRows, type IsPicked } from './rows'

export interface FileViewDeps {
  kit: Kit
  markdown: Sig<Markdown | undefined>
  picker?: LinePicker
}

const note = (kit: Kit, text: string) => inset(kit.emptyState({ text }))

const pickedBy = (picker: LinePicker, path: string): IsPicked => {
  const range = picker.of(path)
  return index => () => {
    const now = range.get()
    return now !== undefined && index >= now.from && index <= now.to
  }
}

const notesOf = (lines: DiffLine[], decorate: DiffFileOptions['decorate']) => (decorate ? lines.map(line => decorate(line)) : [])

const linesView = ({ kit, markdown, picker }: FileViewDeps, path: string, rows: PatchRows, options: DiffFileOptions) => {
  const picked = picker && pickedBy(picker, path)
  const look = derive(() => ({
    split: read(options.split),
    row: { kit, picked, highlight: highlighter(markdown.get(), path), notes: notesOf(rows.lines, options.decorate) },
  }))
  return div(
    { class: 'font-mono text-xs', ...(picker && pickHandlers(picker, path, rows.lines)) },
    dynamicChild(look, ({ split, row }) => (split ? splitRows(row, rows) : unifiedRows(row, rows))),
  )
}

export const fileView = (deps: FileViewDeps, patch: DiffPatch, options: DiffFileOptions) => {
  if (patch.tooLarge) return note(deps.kit, 'This diff is too large to show')
  if (patch.binary) return note(deps.kit, 'Binary file')
  const rows = patchRows(patch)
  if (!rows.lines.length) return note(deps.kit, patch.from ? 'Renamed without changes' : 'No line changes')
  return linesView(deps, patch.path, rows, options)
}
