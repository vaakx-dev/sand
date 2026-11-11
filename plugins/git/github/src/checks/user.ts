import { sessions } from '@sand/chats/contract'
import { turnPending, turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export interface Spoke {
  signal: AbortSignal
  stop(): void
}

export type Listen = (conversation: string) => Spoke

export const listenUser =
  (ctx: Context): Listen =>
  conversation => {
    const controller = new AbortController()
    const queue = ctx.get(turns)
    const session = ctx.get(sessions)?.open(conversation)
    if (!queue || !session) return { signal: controller.signal, stop: () => {} }
    const spoke = () => queue.pending(session).some(item => item.kind === 'steer' && item.origin === 'user')
    const stop = ctx.on(turnPending, changed => {
      if (changed.id === session.id && spoke()) controller.abort()
    })
    if (spoke()) controller.abort()
    return { signal: controller.signal, stop }
  }
