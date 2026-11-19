import { llm } from '@sand/accounts/contract'
import { type Session, sessionEntry, sessions } from '@sand/chats/contract'
import { isPcUnavailable, peers } from '@sand/devices-contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { server } from '@sand/server/contract'
import { joinThreadUsage, threadFamily, threadUsage, type ThreadUsage } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { usageThread, usageThreadChange } from './contract'

export default definePlugin({
  name: 'thread-usage',
  description: 'Answers what a thread and its subagents cost, including subagents on your other PCs, and tells pages when that changes',
  inject: { sessions },
  apply(ctx) {
    const awayFrom = (session: string) => threadFamily(ctx.sessions, session).flatMap(id => ctx.get(orchestrator)?.elsewhere(id) ?? [])

    const usageThere = (pc: string, session: string, root: string) =>
      ctx
        .get(peers)
        ?.call(pc, usageThread, { session, root })
        .catch(error => {
          if (!isPcUnavailable(error)) ctx.report(error)
        })

    const usageOf = async (session: string, root = session) => {
      const here = threadUsage({ sessions: ctx.sessions, llm: ctx.get(llm) }, session, root)
      const there = await Promise.all(awayFrom(session).map(({ thread, pc }) => usageThere(pc, thread, root)))
      return joinThreadUsage(here, there.filter(usage => usage !== undefined))
    }

    const rootOf = (session: Session): string => {
      const parent = session.parent ? ctx.sessions.open(session.parent) : undefined
      return parent ? rootOf(parent) : session.id
    }

    const changed = (session: Session) =>
      usageOf(rootOf(session)).then(
        usage => ctx.get(server)?.broadcast(usageThreadChange, usage),
        error => ctx.report(error),
      )

    const changedAway = ({ session }: ThreadUsage) => {
      const starter = ctx.get(orchestrator)?.starterOf(session)
      const parent = starter && ctx.sessions.open(starter.id)
      if (parent) void changed(parent)
    }

    ctx.on(sessionEntry, (session, entry) => {
      if (entry.type === 'usage') void changed(session)
    })
    ctx.watch(peers, found => found?.on(usageThreadChange, changedAway))
    ctx.watch(server, found => found?.handle(usageThread, ({ session, root }) => usageOf(session, root)))
  },
})
