import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { snapshotsList, snapshotsRestore } from './contract'
import type { SnapshotDeps } from './deps'
import { restoreTurn } from './restore/restore'
import { listTurns } from './turns/list'

export const serveSnapshots = (server: Server, deps: SnapshotDeps) =>
  joinDisposers(
    server.handle(snapshotsList, ({ session }) => listTurns(deps, deps.sessions.require(session))),
    server.handle(snapshotsRestore, request => restoreTurn(deps, request)),
  )
