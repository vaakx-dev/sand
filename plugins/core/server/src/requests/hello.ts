import type { Hello, WireRequestOf } from '@sand/protocol'
import type { ServerContext } from '../context'
import { withBusyFamilies } from './families'

export const helloRequest = (ctx: ServerContext) => {
  const active = new Map<string, number>()
  ctx.on('turn.start', session => void active.set(session.id, Date.now()))
  ctx.on('turn.end', session => void active.delete(session.id))

  const summaries = (request: WireRequestOf<'hello'>) => {
    if (!('since' in request)) return { sessions: ctx.sessions.list() }
    return ctx.sessions.synced(request.since ?? null, [...active.keys()])
  }

  const base = (request: WireRequestOf<'hello'>): Hello => ({
    models: ctx.llm?.models?.(),
    sources: ctx.llm?.sources?.(),
    levels: ctx.llm?.levels?.(),
    limits: ctx.llm?.limits?.(),
    defaults: ctx.modelSettings?.defaults(),
    attachments: ctx.attachments?.limits,
    ...summaries(request),
    active: [...active.keys()],
    started: Object.fromEntries(active),
    jobs: [],
    skills: [],
    safe: ctx.cli.safe,
  })

  return async (request: WireRequestOf<'hello'>) => {
    const hello = await ctx.waterfall('server.hello', base(request))
    return 'since' in request ? withBusyFamilies(ctx, hello, [...active.keys()]) : hello
  }
}
