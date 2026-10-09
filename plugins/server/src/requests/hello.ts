import type { Hello } from '@sand/protocol'
import type { ServerContext } from '../context'

export const helloRequest = (ctx: ServerContext) => {
  const active = new Set<string>()
  ctx.on('turn.start', session => void active.add(session.id))
  ctx.on('turn.end', session => void active.delete(session.id))

  const base = (): Hello => ({
    models: ctx.llm?.models?.(),
    levels: ctx.llm?.levels?.(),
    limits: ctx.llm?.limits?.(),
    defaults: ctx.modelSettings?.defaults(),
    attachments: ctx.attachments?.limits,
    sessions: ctx.sessions.list(),
    active: [...active],
    jobs: [],
    skills: [],
  })

  return () => ctx.waterfall('server.hello', base())
}
