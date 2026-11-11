import type { DiffFile } from '@sand/git-diff/contract'
import type { DiffView } from '@sand/git-diff-view/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { derive, div, effect, list, sig, untrack } from '@vaakx-dev/vrui'
import type { Changes } from './live'

const gone = () => Promise.reject(new Error('This file has no changes left'))

export const changesView = (view: DiffView, changesOf: (subject: Subject) => Changes | undefined, subject: () => Subject) => {
  const changes = derive(() => changesOf(subject()))
  const files = derive(() => changes.get()?.files ?? [])
  const patches = view.patches<DiffFile>(file => untrack(() => changes.get())?.patch(file) ?? gone())

  effect(() => {
    patches.files(files.get())
    untrack(() => patches.stale())
  })

  return list(
    files,
    file => file.path,
    file => view.section(file, { patches, open: sig(false), body: patch => view.file(patch, { split: false }) }),
    div({ class: 'flex min-w-0 flex-col' }),
  )
}
