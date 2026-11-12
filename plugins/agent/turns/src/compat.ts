import type { Session } from '@sand/chats/contract'
import { loop, loopInterrupt, loopRun, loopSteer, loopUnsteer, queueChange, type QueueState } from '@sand/loop/contract'
import { server, sessionOpened, userWrote } from '@sand/server/contract'
import { turnPending, type Turns } from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { TurnsContext } from './context'

const queueOf = (service: Turns, session: Session): QueueState => ({ steers: service.pending(session) })

export const serveLoop = (ctx: TurnsContext, service: Turns) => {
  const session = (id: string) => ctx.sessions.require(id)
  ctx.provide(loop, {
    run: (chat, prompt, signal) => service.run(chat, prompt, { signal }),
    interrupt: chat => service.interrupt(chat),
    active: chat => Boolean(service.current(chat)),
  })
  ctx.on(sessionOpened, (opened, chat) => ({ ...opened, queue: queueOf(service, chat) }))
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      ctx.on(turnPending, chat => found.broadcast(queueChange, [chat.id, queueOf(service, chat)])),
      found.handle(loopRun, ({ session: id, prompt, settings }) => {
        const chat = session(id)
        ctx.emit(userWrote, chat)
        if (settings) ctx.modelSettings.change(chat, settings)
        return service.run(chat, prompt)
      }),
      found.handle(loopSteer, async ({ session: id, prompt, label }) => {
        const chat = session(id)
        if (!service.current(chat)) return null
        ctx.emit(userWrote, chat)
        const sent = await service.send(chat, { prompt, mode: 'steer', clientRequestId: Bun.randomUUIDv7(), ...(label && { label }) })
        return sent.disposition === 'started' ? sent.turn : sent.pending
      }),
      found.handle(loopUnsteer, ({ session: id, item }) => service.withdraw(session(id), item)),
      found.handle(loopInterrupt, ({ session: id }) => service.interrupt(session(id))),
    )
  })
}
