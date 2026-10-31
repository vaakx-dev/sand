import type { DiffPatch } from '@sand/git-diff/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { lineNotes } from './notes'
import { offDiffComments } from './off-diff'

export const patchBody = (tab: CodeTab, path: string, patch: DiffPatch) => {
  const { ctx, files, layout, selection } = tab
  const decorate = lineNotes(tab, path)
  return dynamicChild(files.commit, commit => {
    if (commit) return ctx.diff.file(patch, { split: layout.split })
    return div(offDiffComments(tab, path, patch), ctx.diff.file(patch, { split: layout.split, selection, decorate }))
  })
}
