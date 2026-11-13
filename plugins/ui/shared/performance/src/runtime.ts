import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { type ChatUse, processes } from '@sand/processes/contract'
import { server } from '@sand/server/contract'
import { type Context, definePlugin } from 'drydock'
import { type ChatRow, performanceRead } from './contract'

const named = (ctx: Context, chat: ChatUse): ChatRow => {
  const session = ctx.get(sessions)?.open(chat.conversation)
  if (session) return { ...chat, title: session.title, place: { kind: 'thread', cwd: session.cwd, project: session.project, quick: session.kind === 'quick' } }
  return { ...chat, title: ctx.get(bots)?.get(chat.conversation)?.name ?? 'A chat', place: { kind: 'bot' } }
}

export default definePlugin({
  name: 'performance',
  description: "Answers the Performance page with this PC's memory and CPU over time and what each chat, sand and other apps use, with the chats named",
  inject: { processes },
  apply(ctx) {
    ctx.watch(server, found =>
      found?.handle(performanceRead, async ({ range }) => {
        const report = await ctx.processes.performance(range)
        return { ...report, chats: report.chats.map(chat => named(ctx, chat)) }
      }),
    )
  },
})
