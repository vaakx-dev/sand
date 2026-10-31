import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { DiffSelection, DiffView } from './contract'
import { patchRows } from './patch/rows'
import { linePicker, type LinePicker } from './select/picker'
import { fileView } from './view/file'
import { fileHead } from './view/head'
import { kindMark, lineStat, pathLabel } from './view/marks'

export const diffFiles = (kit: Kit, markdown: Sig<Markdown | undefined>): DiffView => {
  const pickers = new WeakMap<DiffSelection, LinePicker>()
  return {
    selection() {
      const picker = linePicker()
      pickers.set(picker.selection, picker)
      return picker.selection
    },
    marks: { kind: kindMark, path: pathLabel, stat: lineStat },
    head: (file, options) => fileHead(kit, file, options),
    file: (patch, options) => fileView({ kit, markdown, picker: options.selection && pickers.get(options.selection) }, patch, options),
    lines: patch => patchRows(patch).lines,
  }
}
