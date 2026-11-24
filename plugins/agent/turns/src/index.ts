import { type Owner, type Session, sessionArchive, sessionBusy, sessionRemove } from '@sand/chats/contract'
import type { TurnInfo as EngineTurn, Runner } from '@sand/engine/contract'
import { needs } from '@sand/tools/contract'
import { turns, type Turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { sessionBrief } from './brief'
import { inject, type TurnsContext } from './context'
import { sessionConversations, turnOf } from './conversations'
import { finalReply } from './reply'
import { serveTurns } from './serve'
import { talkedBackfill } from './talked'

const found = (info: EngineTurn | undefined) => info && turnOf(info)

const attach = (ctx: TurnsContext, owner: Owner): Runner<Session> => {
  ctx.effect(() => ctx.providerThreads.brief(owner, sessionBrief(ctx)))
  ctx.effect(() => ctx.tools.offer(owner, () => needs))
  const runner = ctx.engine.attach(sessionConversations(ctx, owner))
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
  apply(ctx) {
    ctx.ledger.migrate('turns-talked', talkedBackfill)
    const runners: Record<Owner, Runner<Session>> = { thread: attach(ctx, 'thread'), bot: attach(ctx, 'bot') }
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
    serveTurns(ctx, service, () => all.flatMap(runner => runner.live()).map(turnOf))
    ctx.on(sessionBusy, session => service.current(session) !== undefined)
    ctx.on(sessionArchive, session => ctx.providerThreads.release(session))
  },
})
