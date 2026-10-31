import type { PullSummary } from '@sand/github/contract'
import { place } from '@sand/layout/place'
import type { Dispose } from 'drydock'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'
import type { LinkStore } from '../links/store'
import { createDrafts } from './draft'
import { createModel } from './model'
import { createSheet } from './sheet'

export const createOpener = (ctx: PullsContext, store: LinkStore, show: (pull: PullSummary, at: PullPlace) => void) => {
  const drafts = createDrafts()
  let unplace: Dispose | undefined

  const close = () => {
    void unplace?.()
    unplace = undefined
  }

  const open = (at: PullPlace) => {
    close()
    const draft = drafts.of(at.session)
    const opened = (pull: PullSummary) => {
      close()
      drafts.clear(at.session)
      void store.reload(at.session).then(() => show(pull, at))
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
