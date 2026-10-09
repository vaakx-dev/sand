import type { FollowUps } from '@sand/protocol'
import type { Context } from 'drydock'

export const serveQueue = (ctx: Context<'sessions'>, followUps: FollowUps) => {
  const session = (id: string) => {
    const found = ctx.sessions.open(id)
    if (!found) throw new Error(`No thread ${id}`)
    return found
  }
  ctx.watch('server', server => {
    if (!server) return
    const disposers = [
      server.handle('queue.add', request => followUps.add(session(request.session), request.prompt, request.label)),
      server.handle('queue.remove', request => followUps.remove(session(request.session), request.item)),
      server.handle('queue.edit', request => followUps.edit(session(request.session), request.item, request.prompt, request.label)),
      server.handle('queue.move', request => followUps.move(session(request.session), request.item, request.index)),
      server.handle('queue.send', request => followUps.send(session(request.session), request.item)),
    ]
    return () => disposers.forEach(dispose => void dispose())
  })
}
