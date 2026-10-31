import type { PullSummary } from '@sand/github/contract'
import { place } from '@sand/layout/place'
import type { Dispose } from 'drydock'
import type { PullPlace } from '../contract'
import { type PullsContext, toastId } from '../inject'
import { createDrafts } from './draft'
import { createModel } from './model'
import { createSheet } from './sheet'

export const createOpener = (ctx: PullsContext, show: (pull: PullSummary, at: PullPlace) => void) => {
  const drafts = createDrafts()
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
      () => {
        const model = createModel(ctx, at, draft)
        if (!draft.written) void model.write()
        return createSheet(ctx, model, close, opened)
      },
      100,
    )
  }

  return { open, close }
}
