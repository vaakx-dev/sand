import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type Watch, watchChange, watchRemove } from '@sand/watches/contract'
import type { Context } from 'drydock'
import { pullFollow, pullFollows, pullFollowsChangeWire, pullUnfollow } from '../contract'
import { type Follows, OWNER } from './follows'

export const serveFollows = (ctx: Context, server: Server, follows: Follows) => {
  const announce = (watch: Watch) => {
    if (watch.owner === OWNER) server.broadcast(pullFollowsChangeWire, [watch.subject, follows.list(watch.subject)])
  }

  return joinDisposers(
    server.handle(pullFollows, ({ thread }) => follows.list(thread)),
    server.handle(pullFollow, ({ thread, pull }) => follows.followText(thread, pull)),
    server.handle(pullUnfollow, ({ thread, pull }) => follows.unfollow(thread, pull)),
    ctx.on(watchChange, announce),
    ctx.on(watchRemove, announce),
  )
}
