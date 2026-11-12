import { owned, pulse } from '@sand/reactive'
import { threads, threadsChange } from '@sand/web-client/contract'
import { effect, onInterval, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

const refresh = 5000

export const childWatch = (ctx: Context) => {
  const changes = pulse(ctx, [threadsChange], [threads])
  const tick = sig(0)
  const chats = () => ctx.get(threads)
  owned(ctx, () => {
    const running = changes.read(() => chats()?.list().some(chat => chat.info.kind === 'agent' && chat.running) ?? false)
    effect(() => {
      if (running.get()) onInterval(() => tick.update(value => value + 1), refresh)
    })
  })

  return {
    tick: () => tick.get(),
    of(thread: string, call: string) {
      changes.version.get()
      return chats()?.children(thread).find(chat => chat.info.origin === call)
    },
  }
}

export type ChildWatch = ReturnType<typeof childWatch>
