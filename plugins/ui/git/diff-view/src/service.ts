import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { stored, type Sig } from '@vaakx-dev/vrui'
import type { DiffSelection, DiffView } from './contract'
import { patchStore } from './files/patches'
import { fileSection } from './files/section'
import { diffLayout, type DiffLook } from './layout/layout'
import { patchRows } from './patch/rows'
import { linePicker, type LinePicker } from './select/picker'
import { fileView } from './view/file'
import { fileHead } from './view/head'

export const diffFiles = (kit: Kit, markdown: Sig<Markdown | undefined>): DiffView => {
  const pickers = new WeakMap<DiffSelection, LinePicker>()
  const look = stored<DiffLook>('sand.diff.view', 'unified')
  const head: DiffView['head'] = (file, options) => fileHead(kit, file, options)
  return {
    selection() {
      const picker = linePicker()
      pickers.set(picker.selection, picker)
      return picker.selection
    },
    head,
    file: (patch, options) => fileView({ kit, markdown, picker: options.selection && pickers.get(options.selection) }, patch, options),
    lines: patch => patchRows(patch).lines,
    patches: patchStore,
    section: (file, options) => fileSection(kit, head, file, options),
    layout: () => diffLayout(kit, look),
  }
}
