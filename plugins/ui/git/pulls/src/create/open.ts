import { type GitControl, gitControl } from '@sand/git-control/contract'
import type { PullSummary } from '@sand/github/contract'
import { place } from '@sand/layout/place'
import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { PullPlace } from '../contract'
import { type PullsContext, toastId } from '../inject'
import { createDrafts } from './draft'
import { createModel } from './model'
import { createSheet } from './sheet'

export const createOpener = (ctx: PullsContext, show: (pull: PullSummary, at: PullPlace) => void) => {
  const drafts = createDrafts()
  const control = sig<GitControl | undefined>(undefined)
  ctx.watch(gitControl, found => {
    control.set(found)
  })
  let unplace: Dispose | undefined

  const close = () => {
    void unplace?.()
    unplace = undefined
  }

  const reload = (at: PullPlace) =>
    ctx.toasts.attempt(toastId, "Couldn't reload the thread's pull requests", () => ctx.pullLinks.links({ session: at.session }, at.device))

  const open = (at: PullPlace) => {
    close()
    const draft = drafts.of(at.session)
    const opened = (pull: PullSummary) => {
      close()
      drafts.clear(at.session)
      void reload(at).then(() => show(pull, at))
    }
    unplace = place(
      ctx,
      'overlay',
      () => createSheet(ctx, createModel(ctx, at, draft, control), close, opened),
      100,
    )
  }

  return { open, close }
}
