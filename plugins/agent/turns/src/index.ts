import { sessionBusy, sessionRemove, sessionSettle } from '@sand/chats/contract'
import type { TurnInfo as EngineTurn } from '@sand/engine/contract'
import { needs } from '@sand/tools/contract'
import { turns, type Turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { threadBrief } from './brief'
import { inject } from './context'
import { threadConversations, threadTurn } from './conversations'
import { serveTurns } from './serve'

const found = (info: EngineTurn | undefined) => info && threadTurn(info)

const offered = needs.filter(need => need !== 'routines')

export default definePlugin({
  name: 'turns',
  description: 'Runs the turns of each chat on the engine, and serves them to pages',
  inject,
  apply(ctx) {
    ctx.effect(() => ctx.providerThreads.brief('thread', threadBrief(ctx)))
    ctx.effect(() => ctx.tools.offer('thread', () => offered))
    const runner = ctx.engine.attach(threadConversations(ctx))
    ctx.effect(() => runner.detach)

    const service: Turns = {
      send(session, { settings, ...input }) {
        if (settings) ctx.modelSettings.change(session, settings)
        return runner.send(session, input)
      },
      run: runner.run,
      interrupt: runner.interrupt,
      current: session => found(runner.current(session)),
      get: turn => found(runner.get(turn)),
      list: (session, before, limit) => runner.list(session, before, limit).map(threadTurn),
      wait: async (turn, until, signal) => threadTurn(await runner.wait(turn, until, signal)),
      pending: runner.pending,
      withdraw: runner.withdraw,
      hold: runner.hold,
    }

    ctx.provide(turns, service)
    serveTurns(ctx, { service, runner })
    ctx.on(sessionBusy, session => Boolean(runner.current(session)))
    ctx.on(sessionSettle, session => ctx.providerThreads.release(session))
    ctx.on(sessionRemove, id => {
      runner.forget(id)
      ctx.providerThreads.forget({ owner: 'thread', id })
    })
  },
})
