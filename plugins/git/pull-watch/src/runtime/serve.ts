import type { GitHub } from '@sand/github/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type Watch, watchChange, watchRemove } from '@sand/watches/contract'
import type { Context } from 'drydock'
import { pullFollow, pullFollows, pullFollowsChangeWire, pullTalk, pullUnfollow } from '../contract'
import { type Follows, OWNER } from './follows'
import { refOf } from './ref'
import { readTalk } from './talk'

export const serveFollows = (ctx: Context, server: Server, follows: Follows, github: Pick<GitHub, 'rest'>) => {
  const announce = (watch: Watch) => {
    if (watch.owner === OWNER) server.broadcast(pullFollowsChangeWire, [watch.subject, follows.list(watch.subject)])
  }

  return joinDisposers(
    server.handle(pullFollows, ({ thread }) => follows.list(thread)),
    server.handle(pullFollow, ({ thread, pull }) => follows.followText(thread, pull)),
    server.handle(pullTalk, ({ pull }) => readTalk(github, refOf(pull))),
    server.handle(pullUnfollow, ({ thread, pull }) => follows.unfollow(thread, pull)),
    ctx.on(watchChange, announce),
    ctx.on(watchRemove, announce),
  )
}
