import { limitsRefresh, llm } from '@sand/accounts/contract'
import { type Session, sessionEntry, sessions } from '@sand/chats/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { usageSummary, usageThread, usageThreadChange } from './contract'
import { summaryHandler } from './summary/serve'
import { threadUsage } from './summary/thread'

export default definePlugin({
  name: 'usage',
  description: 'Token and cost totals and plan limits for the usage page and sand usage, and what each thread cost',
  inject: { sessions },
  apply(ctx) {
    const refreshLimits = () => {
      const current = ctx.get(llm)
      return current?.refreshLimits?.() ?? current?.limits?.()
    }
    const usageOf = (session: string) => threadUsage({ sessions: ctx.sessions, llm: ctx.get(llm) }, session)
    const rootOf = (session: Session): string => {
      const parent = session.parent ? ctx.sessions.open(session.parent) : undefined
      return parent ? rootOf(parent) : session.id
    }

    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'usage') ctx.get(server)?.broadcast(usageThreadChange, usageOf(rootOf(session)))
    })
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(usageSummary, summaryHandler(ctx.sessions, () => ctx.get(llm))),
            found.handle(usageThread, ({ session }) => usageOf(session)),
            found.handle(limitsRefresh, refreshLimits),
          )
        : undefined,
    )
  },
})
