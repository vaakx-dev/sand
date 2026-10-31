import type { DiffFile } from '@sand/git-diff/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import { openFileButton } from './open-file'
import type { ViewParts } from './parts'

const openLimit = 20

export const fileSection = (parts: ViewParts, file: Sig<DiffFile>, index: number) => {
  const { diff, model, layout, sections } = parts
  const open = sig(index < openLimit)
  return diff.section(file, {
    patches: model.patches,
    open,
    actions: openFileButton(parts, file),
    onMount: element => sections.add(file.get().path, { element, open }),
    body: patch => diff.file(patch, { split: layout.split, selection: model.selection }),
  })
}
