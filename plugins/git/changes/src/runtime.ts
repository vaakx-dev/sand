import { sessionRemove, sessions, sessionUpdate } from '@sand/chats/contract'
import { notify } from '@sand/devices-notify/contract'
import { gitRepo, pathKey } from '@sand/git/contract'
import { gitDiffs } from '@sand/git-diff/contract'
import { gitRunner } from '@sand/git-runner/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { paths } from '@sand/paths/contract'
import { type Server, server } from '@sand/server/contract'
import { turnEnd, turns, turnStart } from '@sand/turns-contract/contract'
import { joinDisposers, keyedSerial } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { changesChange, type ThreadChanges } from './contract'
import type { Attempt, ChangesDeps } from './deps'
import { createMerged } from './merged'
import { serveChanges } from './requests'
import { mergeTool } from './tool'
import { createTracker } from './tracker'

export default definePlugin({
  name: 'changes',
  description: "Knows which threads in their own worktree have work ready to merge, shows what they changed, and merges it into the project folder's branch on this PC",
  inject: { gitRunner, gitRepo, gitDiffs, sessions, paths },
  apply(ctx) {
    let live: Server | undefined
    const report = (error: unknown) => ctx.report(error)
    const merged = createMerged(join(ctx.paths.home, 'merged.json'), () => ctx.busy())
    merged.ready().catch(report)
    const settleAfterTurn = new Set<string>()
    const byRepo = keyedSerial()

    const busy = (id: string): boolean => {
      const session = ctx.sessions.open(id)
      return Boolean(session && ctx.get(turns)?.current(session)) || ctx.sessions.children(id).some(child => busy(child.id))
    }

    const deps: ChangesDeps = {
      git: ctx.gitRunner,
      repos: ctx.gitRepo,
      diffs: ctx.gitDiffs,
      sessions: ctx.sessions,
      merged,
      attempts: new Map<string, Attempt>(),
      busy,
      async settle(id) {
        if (busy(id)) settleAfterTurn.add(id)
        else await ctx.sessions.settle(id, true)
      },
      queue: (main, task) => byRepo(pathKey(main), task),
      changed: id => tracker.publish(id),
      report,
    }
    const troubled = new Set<string>()
    const tellTrouble = (changes: ThreadChanges) => {
      if (changes.state !== 'conflict' && changes.state !== 'failed') return void troubled.delete(changes.session)
      if (troubled.has(changes.session)) return
      troubled.add(changes.session)
      ctx
        .get(notify)
        ?.send({ kind: 'needs', thread: changes.session, title: ctx.sessions.open(changes.session)?.title ?? 'Thread', text: changes.reason ?? "Couldn't merge" })
        .catch(report)
    }
    const tracker = createTracker(deps, changes => {
      live?.broadcast(changesChange, changes)
      tellTrouble(changes)
    })
    ctx.effect(() => tracker.close)

    for (const session of ctx.sessions.list()) tracker.follow(session)
    ctx.on(sessionUpdate, session => tracker.follow(session))
    ctx.on(sessionRemove, id => {
      troubled.delete(id)
      tracker.forget(id)
      merged.drop(id).catch(report)
    })
    ctx.on(turnStart, session => {
      const hadOutcome = deps.attempts.delete(session.id) || merged.get(session.id) !== undefined
      merged.drop(session.id).catch(report)
      tracker.follow(session)
      if (hadOutcome) tracker.publish(session.id).catch(report)
      else tracker.poke(session.id)
    })
    ctx.on(turnEnd, session => {
      if (settleAfterTurn.delete(session.id)) ctx.sessions.settle(session.id, true).catch(report)
      tracker.poke(session.id)
    })

    ctx.watch(mcpTools, found => found?.register(mergeTool))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(serveChanges(found, deps, tracker), () => {
        live = undefined
      })
    })
  },
})
