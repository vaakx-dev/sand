import { type Session, sessionClosing, sessionRemove, sessions } from '@sand/chats/contract'
import { gitRepo, gitRunner } from '@sand/git/contract'
import { loop, turnEnd, turnReady } from '@sand/loop/contract'
import { type Server, server, sessionCarry } from '@sand/server/contract'
import { errorMessage, joinDisposers, keyedSerial } from '@sand/util'
import { definePlugin } from 'drydock'
import { snapshotsChange } from './contract'
import type { SnapshotDeps } from './deps'
import { createHolds } from './git/holds'
import { isInside, pathKey } from './git/repo'
import { serveSnapshots } from './requests'
import { createCleanup } from './turns/cleanup'
import { snapshotEntry } from './turns/entries'
import { listTurns } from './turns/list'
import { createTurnTracker } from './turns/track'

const snapshotted = (session: Session) => session.kind !== 'quick'

export default definePlugin({
  name: 'git-snapshots',
  description: "Snapshots a thread's git folder before and after each turn in hidden commits, lists what each turn changed and restores files to before or after a turn",
  inject: { gitRunner, sessions },
  apply(ctx) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const serialByRepo = keyedSerial()
    const holds = createHolds(() => ctx.busy())
    ctx.effect(() => holds.drain)

    const running = (id: string) => {
      const turns = ctx.get(loop)
      if (!turns) return false
      const session = ctx.sessions.open(id)
      return Boolean(session && turns.active(session))
    }

    const deps: SnapshotDeps = {
      git: ctx.gitRunner,
      sessions: ctx.sessions,
      queue: (root, task) => holds.hold(() => serialByRepo(pathKey(root), task)),
      busyIn: root => ctx.sessions.list().some(summary => isInside(root, summary.cwd) && running(summary.id)),
      changed(session) {
        const found = live
        if (!found) return
        listTurns(deps, session)
          .then(turns => found.broadcast(snapshotsChange, turns))
          .catch(report)
      },
      refresh: cwd => void ctx.get(gitRepo)?.refresh(cwd).catch(report),
    }
    const tracker = createTurnTracker(deps)
    const cleanup = createCleanup(deps)
    const failed = (session: Session, when: string) => (error: unknown) =>
      report(new Error(`Couldn't snapshot ${session.cwd} ${when} the turn: ${errorMessage(error)}`))

    ctx.on(sessionCarry, types => [...types, snapshotEntry])
    ctx.on(
      turnReady,
      async (start, session) => {
        if (snapshotted(session)) await tracker.begin(session, start.id).catch(failed(session, 'before'))
      },
      { priority: -100 },
    )
    ctx.on(turnEnd, session => {
      if (snapshotted(session)) tracker.end(session).catch(failed(session, 'after'))
    })
    ctx.on(sessionClosing, session => {
      if (snapshotted(session)) cleanup.note(session)
    })
    ctx.on(sessionRemove, id => void cleanup.remove(id).catch(report))

    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(serveSnapshots(found, deps), () => {
        live = undefined
      })
    })
  },
})
