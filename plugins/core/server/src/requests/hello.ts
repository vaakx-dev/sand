import type { Hello, WireRequestOf } from '@sand/protocol'
import { helloParts } from '@sand/kit'
import type { ServerContext } from '../context'

type HelloRequest = WireRequestOf<'hello'>

const withBusyFamilies = (ctx: ServerContext, hello: Hello, active: string[]): Hello => {
  const parents = new Set([...active, ...hello.jobs.filter(job => job.status === 'running').map(job => job.parent)])
  if (!parents.size) return hello
  const known = new Set(hello.sessions.map(session => session.id))
  const children = [...parents].flatMap(parent => ctx.sessions.children(parent)).filter(child => !known.has(child.id) && known.add(child.id))
  return children.length ? { ...hello, sessions: [...hello.sessions, ...children] } : hello
}

const trimmed = (hello: Hello, known?: string): Partial<Hello> => {
  const { fresh, shared } = helloParts(hello)
  const tag = Bun.hash(JSON.stringify(shared)).toString(36)
  return known === tag ? { ...fresh, tag, same: true } : { ...hello, tag }
}

export const helloRequest = (ctx: ServerContext) => {
  const active = new Map<string, number>()
  ctx.on('turn.start', session => void active.set(session.id, Date.now()))
  ctx.on('turn.end', session => void active.delete(session.id))

  const summaries = (request: HelloRequest) => {
    if (!('since' in request)) return { sessions: ctx.sessions.list() }
    return ctx.sessions.synced(request.since ?? null, [...active.keys()])
  }

  const base = (request: HelloRequest): Hello => ({
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

  return async (request: HelloRequest) => {
    const hello = await ctx.waterfall('server.hello', base(request))
    return trimmed('since' in request ? withBusyFamilies(ctx, hello, [...active.keys()]) : hello, request.known)
  }
}
