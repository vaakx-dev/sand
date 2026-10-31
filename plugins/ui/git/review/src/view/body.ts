import type { ReviewFile } from '@sand/pull-review/contract'
import { div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { lineNotes } from './notes'
import { offDiffComments } from './off-diff'

const note = ({ kit }: CodeTab, text: string) => div({ class: 'px-4' }, kit.emptyState({ text }))

export const fileBody = (tab: CodeTab, file: Sig<ReviewFile>) => {
  const { kit, patches, files, layout, selection } = tab
  const path = file.get().path
  const decorate = lineNotes(tab, path)
  return dynamicChild(patches.state(path), now => {
    if (file.get().binary) return note(tab, 'Binary file')
    if (now.kind === 'ready')
      return dynamicChild(files.commit, commit => {
        if (commit) return tab.ctx.diff.file(now.patch, { split: layout.split })
        return div(offDiffComments(tab, path, now.patch), tab.ctx.diff.file(now.patch, { split: layout.split, selection, decorate }))
      })
    if (now.kind === 'error') return div({ class: 'px-4' }, kit.errorState({ text: `Couldn't load this diff: ${now.message}`, retry: () => patches.retry(path) }))
    return div({ class: 'px-4' }, kit.loadingState())
  })
}
