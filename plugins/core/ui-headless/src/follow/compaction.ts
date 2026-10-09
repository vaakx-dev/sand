import type { ContextUsage, SessionInfo } from '@sand/protocol'
import { tokens } from '@sand/kit'

export const createCompactionLines = (inFamily: (session: string) => boolean) => {
  const names = new Map<string, string>()
  const active = new Map<string, number>()
  const subject = (session: string) => {
    const name = names.get(session)
    return name ? `${name} context` : 'context'
  }

  return {
    name(agent: SessionInfo) {
      names.set(agent.id, agent.title ?? 'agent')
    },
    change(session: string, usage: ContextUsage) {
      if (!inFamily(session)) return undefined
      const started = active.get(session)
      if (usage.compacting && started === undefined) {
        active.set(session, usage.used)
        return `◌ compacting ${subject(session)} at ${tokens(usage.used)} tokens`
      }
      if (usage.compacting || started === undefined) return undefined
      active.delete(session)
      return started === usage.used
        ? `◌ ${subject(session)} was not compacted`
        : `◌ compacted ${subject(session)}: ${tokens(started)} → ${tokens(usage.used)} tokens`
    },
  }
}
