import type { DiffFile } from '@sand/git-diff/contract'
import { div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { PatchState } from '../model/patches'
import type { ViewParts } from './parts'

const note = ({ kit }: ViewParts, text: string) => div({ class: 'px-4' }, kit.emptyState({ text }))

export const fileBody = (parts: ViewParts, file: Sig<DiffFile>, state: Sig<PatchState>, retry: () => void) =>
  dynamicChild(state, now => {
    if (file.get().binary) return note(parts, 'Binary file')
    if (now.kind === 'ready') return parts.diff.file(now.patch, { split: () => parts.layout.view.get() === 'split', selection: parts.model.selection })
    if (now.kind === 'error') return div({ class: 'px-4' }, parts.kit.errorState({ text: `Couldn't load this diff: ${now.message}`, retry }))
    return div({ class: 'px-4' }, parts.kit.loadingState())
  })
