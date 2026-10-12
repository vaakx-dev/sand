import type { FollowUps } from './contract'
import type { Context } from 'drydock'

export const serveQueue = (ctx: Context<'sessions'>, followUps: FollowUps) => {
  const { sessions } = ctx
  ctx.watch('server', server =>
    server?.handle({
      'queue.add': request => followUps.add(sessions.require(request.session), request.prompt, request.label, request.from),
      'queue.remove': request => followUps.remove(sessions.require(request.session), request.item),
      'queue.edit': request => followUps.edit(sessions.require(request.session), request.item, request.prompt, request.label),
      'queue.move': request => followUps.move(sessions.require(request.session), request.item, request.index),
      'queue.send': request => followUps.send(sessions.require(request.session), request.item),
    }),
  )
}
