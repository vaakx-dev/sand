import type { ReviewFile } from '@sand/pull-review/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { patchBody } from './body'
import { fileTags, viewedToggle } from './viewed'

export const fileSection = (tab: CodeTab, file: Sig<ReviewFile>) => {
  const path = file.get().path
  const open = sig(file.get().viewed !== 'viewed')
  return tab.ctx.diff.section(file, {
    patches: tab.patches,
    open,
    tags: fileTags(tab, file),
    actions: viewedToggle(tab, file, open),
    body: patch => patchBody(tab, path, patch),
  })
}
