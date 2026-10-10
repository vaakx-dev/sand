import { existsSync } from 'node:fs'
import type { ServerContext } from '../context'
import { info } from '../socket/serialize'
import type { CoreHandlers } from './registry'
import { openSession } from './open'

export const sessionRequests = (ctx: ServerContext): CoreHandlers => {
  const session = (id: string) => openSession(ctx, id)
  return {
    'sessions.list': () => ctx.sessions.list(),
    'sessions.create': request => {
      const { settings, cwd, ...options } = request.options
      if (cwd && !existsSync(cwd)) throw new Error(`${cwd} is not a folder on this PC`)
      const created = ctx.sessions.create({ ...options, ...(cwd && { cwd }) })
      if (settings && Object.keys(settings).length) ctx.modelSettings?.update(created, settings)
      return info(created)
    },
    'sessions.branch': request => info(ctx.sessions.branch(session(request.session), request.into, request.at)),
    'session.append': request => {
      session(request.session).append(request.entry.type, request.entry.data, request.entry.id)
      return true
    },
    'session.checkout': request => {
      session(request.session).checkout(request.entry)
      return true
    },
    'sessions.remove': request => {
      ctx.sessions.remove(request.session)
      return true
    },
    'session.rename': request => {
      session(request.session).rename(request.title, request.named)
      return true
    },
  }
}
