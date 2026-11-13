import { llm } from '@sand/accounts/contract'
import { type Session, sessionEntry, sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { threadUsage } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { usageThread, usageThreadChange } from './contract'

export default definePlugin({
  name: 'thread-usage',
  description: 'Answers what a thread and its subagents cost, and tells pages when that changes',
  inject: { sessions },
  apply(ctx) {
    const usageOf = (session: string) => threadUsage({ sessions: ctx.sessions, llm: ctx.get(llm) }, session)
    const rootOf = (session: Session): string => {
      const parent = session.parent ? ctx.sessions.open(session.parent) : undefined
      return parent ? rootOf(parent) : session.id
    }

    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'usage') ctx.get(server)?.broadcast(usageThreadChange, usageOf(rootOf(session)))
    })
    ctx.watch(server, found => found?.handle(usageThread, ({ session }) => usageOf(session)))
  },
})
