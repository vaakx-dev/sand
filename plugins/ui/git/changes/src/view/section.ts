import type { DiffFile } from '@sand/git-diff/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { ViewParts } from './parts'

const openLimit = 20

export const fileSection = ({ diff, model, layout }: ViewParts, file: Sig<DiffFile>, index: number) => {
  const open = sig(index < openLimit)
  return diff.section(file, {
    patches: model.patches,
    open,
    body: patch => diff.file(patch, { split: layout.split, selection: model.selection }),
  })
}
