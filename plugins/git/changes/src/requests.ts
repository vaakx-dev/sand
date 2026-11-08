import type { Caller } from '@sand/host-hub/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { changesList, changesMerge, changesPatch } from './contract'
import type { ChangesDeps } from './deps'
import { mergeThread } from './merge'
import { patchOf } from './patch'
import type { Tracker } from './tracker'

const threadOf = (session: string | undefined, { actor }: Caller) => {
  if (session) return session
  if (actor?.owner !== 'thread') throw new Error('Name the thread to merge')
  return actor.id
}

export const serveChanges = (server: Server, deps: ChangesDeps, tracker: Tracker) =>
  joinDisposers(
    server.handle(changesList, input => tracker.list(input)),
    server.handle(changesPatch, input => patchOf(deps, input)),
    server.handle(changesMerge, ({ session }, caller) => {
      const id = threadOf(session, caller)
      return mergeThread(deps, id, caller.actor?.owner === 'thread' && caller.actor.id === id)
    }),
  )
