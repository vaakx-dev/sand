import { placeKey, repoOf } from '@sand/git/contract'
import { place } from '@sand/layout/place'
import type { Dispose } from 'drydock'
import { commitReason } from '../next/reasons'
import type { ControlParts } from '../parts'
import { commitDrafts } from './drafts'
import { commitSheet } from './sheet'

export const commitOpener = (parts: () => ControlParts) => {
  const drafts = commitDrafts()
  let unplace: Dispose | undefined

  const close = () => {
    void unplace?.()
    unplace = undefined
  }

  const open = () => {
    const current = parts()
    const at = current.model.place.get()
    const local = repoOf(current.model.status.get())
    if (!at || !local || commitReason(local)) return
    close()
    const key = placeKey(at)
    const draft = drafts.of(key)
    unplace = place(current.ctx, 'overlay', () => commitSheet(current, draft, close, () => drafts.clear(key)), 100)
  }

  return { open, close }
}
