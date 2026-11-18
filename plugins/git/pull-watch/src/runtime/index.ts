import { sessionRemove, sessions } from '@sand/chats/contract'
import { checksSettled, github } from '@sand/github/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { toolResult, turnEnd, turns } from '@sand/turns-contract/contract'
import { watches, watchRemove } from '@sand/watches/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createArchive } from './archive'
import { ciKeyOf } from './changes'
import { createFollows, OWNER } from './follows'
import { pullKind } from './kind'
import { createKnown } from './known'
import { watchOpened } from './opened'
import { serveFollows } from './serve'
import { registerTools } from './tools'
import { wakeThread } from './wake'

export default definePlugin({
  name: 'pull-watch',
  description:
    "Lets a thread keep up with its pull requests: it follows the PRs it opens, a cheap watcher follows each one with no model, and the thread gets a turn when CI finishes, a review or comment lands, or the PR closes or conflicts. Once every PR a thread follows has merged or closed and one merged, the thread is archived, after its turn if it is working",
  inject: { watches, sessions, turns, github },
  config: z
    .object({
      poll_ms: z.number().int().positive().default(60_000),
      settle_ms: z.number().int().positive().default(5_000),
    })
    .prefault({}),
  apply(ctx, { poll_ms, settle_ms }) {
    const follows = createFollows(ctx)
    const known = createKnown()
    const archive = createArchive({ sessions: ctx.sessions, turns: ctx.turns, follows })
    const opened = watchOpened({ turns: ctx.turns, github: ctx.github, follows, report: error => ctx.report(error) })
    ctx.effect(() => ctx.watches.kind(pullKind(ctx.github, { pollMs: poll_ms, settleMs: settle_ms })))
    ctx.effect(() => ctx.watches.handle(OWNER, wakeThread({ sessions: ctx.sessions, turns: ctx.turns, known, archive })))
    ctx.on(toolResult, (result, _call, session) => {
      opened.result(result, session)
      return result
    })
    ctx.on(turnEnd, session => void archive.turnEnded(session.id)?.catch(error => ctx.report(error)))
    ctx.on(watchRemove, watch => archive.forgetWatch(watch.id))
    ctx.on(checksSettled, (conversation, sha, outcome) => known.add(conversation, ciKeyOf(sha, outcome)))
    ctx.on(sessionRemove, thread => {
      follows.forget(thread)
      opened.forget(thread)
      known.forget(thread)
      archive.forgetThread(thread)
    })
    ctx.watch(server, found => found && serveFollows(ctx, found, follows, ctx.github))
    ctx.watch(tools, found => found && registerTools(found, follows))
  },
})
