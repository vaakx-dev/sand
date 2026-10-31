import { threadChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { owned } from '@sand/web-client/reactive'
import { batch, derive, sig } from '@vaakx-dev/vrui'
import type { ControlContext } from '../inject'

export const followStatus = (ctx: ControlContext) => {
  const { current } = ctx.gitStatus
  const thread = sig<string | undefined>(undefined)
  const running = sig(false)

  const sync = () => {
    const chat = ctx.threads.current()
    batch(() => {
      thread.set(chat?.id)
      running.set(chat?.running ?? false)
    })
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(threadChange, sync)
  sync()

  return owned(ctx, () => ({ place: derive(() => current.get()?.place), status: derive(() => current.get()?.status), thread, running }))
}

export type StatusModel = ReturnType<typeof followStatus>
