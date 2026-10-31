import { gitStatusClient, type GitStatus } from '@sand/git/contract'
import { errorMessage } from '@sand/util'
import { batch, derive, effect, sig } from '@vaakx-dev/vrui'
import type { PullPlace } from '../contract'
import type { PullsContext } from '../inject'
import type { CreateDraft } from './draft'
import { baseOf, blockReason } from './facts'

export const createModel = (ctx: PullsContext, at: PullPlace, draft: CreateDraft) => {
  const client = ctx.get(gitStatusClient)
  const status = sig<GitStatus | undefined>(undefined)
  const writing = sig(false)
  const writeError = sig('')
  const busy = sig(false)

  if (client)
    effect(() => {
      const stop = client.follow(at, next => status.set(next))
      return () => void stop()
    })

  const write = async () => {
    if (writing.get()) return
    batch(() => {
      writing.set(true)
      writeError.set('')
    })
    try {
      const text = await ctx.github.text({ cwd: at.cwd, base: baseOf(status.get()), session: at.session }, at.device)
      batch(() => {
        draft.title.set(text.title)
        draft.body.set(text.body)
      })
      draft.written = true
    } catch (error) {
      writeError.set(errorMessage(error))
    } finally {
      writing.set(false)
    }
  }

  const blocked = derive(() => blockReason(status.get()))
  const canCreate = () => !busy.get() && !writing.get() && !blocked.get() && Boolean(draft.title.get().trim())

  return { at, draft, status, writing, writeError, busy, blocked, canCreate, write }
}

export type CreateModel = ReturnType<typeof createModel>
