import { bots } from '@sand/bots/contract'
import { type Session, sessions } from '@sand/chats/contract'
import { type ChatUse, machineRead, processes, type Range } from '@sand/processes/contract'
import { pageLeft, server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type Context, definePlugin } from 'drydock'
import { type ChatPlace, type ChatRow, performanceChange, performanceUnwatch, performanceWatch } from './contract'
import { shown } from './precision'
import { Watchers } from './watchers'

const LIVE_MS = 10_000

const UNKNOWN_CHAT = 'A chat'

const placeOf = (session: Session): ChatPlace =>
  session.kind === 'bot' ? { kind: 'bot' } : { kind: 'thread', cwd: session.cwd, project: session.project, quick: session.kind === 'quick' }

const titleOf = (ctx: Context, session: Session) => (session.kind === 'bot' ? ctx.get(bots)?.get(session.id)?.name : session.title) ?? UNKNOWN_CHAT

const named = (ctx: Context, chat: ChatUse): ChatRow => {
  const session = ctx.get(sessions)?.open(chat.conversation)
  if (!session) return { ...chat, title: UNKNOWN_CHAT, place: { kind: 'bot' } }
  return { ...chat, title: titleOf(ctx, session), place: placeOf(session) }
}

export default definePlugin({
  name: 'performance',
  description: "Sends the Performance page this PC's memory and CPU over time and what each chat, sand and other apps use, with the chats named, then only what changes while the page is open",
  inject: { processes },
  apply(ctx) {
    const report = async (range: Range) => {
      const found = await ctx.processes.performance(range)
      return shown({ ...found, chats: found.chats.map(chat => named(ctx, chat)) })
    }
    const watchers = new Watchers({ report, tell: (caller, change) => ctx.get(server)?.tell(caller, performanceChange, change), fail: error => ctx.report(error), everyMs: LIVE_MS })
    ctx.on(pageLeft, caller => watchers.leave(caller))
    ctx.on(machineRead, reading => watchers.heard(reading.at))
    ctx.watch(
      server,
      found =>
        found &&
        joinDisposers(
          found.handle(performanceWatch, ({ range }, caller) => watchers.watch(caller, range)),
          found.handle(performanceUnwatch, (_, caller) => watchers.leave(caller)),
        ),
    )
  },
})
