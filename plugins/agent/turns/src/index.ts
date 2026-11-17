import { type Owner, type Session, sessionArchive, sessionBusy, sessionRemove } from '@sand/chats/contract'
import type { TurnInfo as EngineTurn, Runner } from '@sand/engine/contract'
import { needs } from '@sand/tools/contract'
import { type Sending, turns, type Turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { sessionBrief } from './brief'
import { inject, type TurnsContext } from './context'
import { sessionConversations, turnOf } from './conversations'
import { finalReply } from './reply'
import { serveTurns } from './serve'
import { talkedBackfill } from './talked'

const found = (info: EngineTurn | undefined) => info && turnOf(info)

const attach = (ctx: TurnsContext, owner: Owner, sending: () => Sending): Runner<Session> => {
  ctx.effect(() => ctx.providerThreads.brief(owner, sessionBrief(ctx)))
  ctx.effect(() => ctx.tools.offer(owner, () => needs))
  const runner = ctx.engine.attach(sessionConversations(ctx, owner, () => sending().queue))
  ctx.effect(() => runner.detach)
  ctx.on(sessionRemove, id => {
    runner.forget(id)
    ctx.providerThreads.forget({ owner, id })
  })
  return runner
}

export default definePlugin({
  name: 'turns',
  description: "Runs the turns of each chat on the engine, a thread's or a bot's, and serves them to pages",
  inject,
  config: z.object({ queue: z.boolean().default(false) }).default({ queue: false }),
  apply(ctx, config) {
    ctx.ledger.migrate('turns-talked', talkedBackfill)
    let sending: Sending = config
    const currentSending = () => sending
    const runners: Record<Owner, Runner<Session>> = { thread: attach(ctx, 'thread', currentSending), bot: attach(ctx, 'bot', currentSending) }
    const all = Object.values(runners)
    const runnerOf = (session: Session) => runners[session.owner]
    const engineTurn = (turn: string) => all.map(runner => runner.get(turn)).find(info => info !== undefined)
    const owning = (turn: string) => {
      const info = engineTurn(turn)
      if (!info) throw new Error(`No turn ${turn}`)
      return runners[info.owner]
    }

    const service: Turns = {
      send(session, { settings, ...input }) {
        if (settings) ctx.modelSettings.change(session, settings)
        return runnerOf(session).send(session, input)
      },
      run: (session, prompt, options) => runnerOf(session).run(session, prompt, options),
      interrupt: (session, turn) => runnerOf(session).interrupt(session, turn),
      current: session => found(runnerOf(session).current(session)),
      get: turn => found(engineTurn(turn)),
      list: (session, before, limit) => runnerOf(session).list(session, before, limit).map(turnOf),
      wait: async (turn, until, signal) => turnOf(await owning(turn).wait(turn, until, signal)),
      follow: async (session, sent, signal) => found(await runnerOf(session).follow(session, sent, signal)),
      reply: (session, turn) => (runnerOf(session).get(turn)?.ended === undefined ? undefined : finalReply(session, turn)),
      pending: session => runnerOf(session).pending(session),
      withdraw: (session, pending) => runnerOf(session).withdraw(session, pending),
      hold: (session, pending, held) => runnerOf(session).hold(session, pending, held),
    }

    ctx.provide(turns, service)
    const setSending = async (next: Sending) => {
      await ctx.sandConfig.set(['plugins', 'turns'], { ...next })
      sending = next
      return sending
    }

    serveTurns(ctx, service, () => all.flatMap(runner => runner.live()).map(turnOf), { current: currentSending, set: setSending })
    ctx.on(sessionBusy, session => service.current(session) !== undefined)
    ctx.on(sessionArchive, session => ctx.providerThreads.release(session))
  },
})
