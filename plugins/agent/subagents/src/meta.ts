import type { Session } from '@sand/chats/contract'
import type { AgentMeta } from './contract'

export type Meta = (session: Session) => AgentMeta | undefined

export const createMeta = (): Meta => {
  const cache = new Map<string, AgentMeta | null>()
  return session => {
    if (!cache.has(session.id)) cache.set(session.id, (session.latest('agent')?.data as AgentMeta | undefined) ?? null)
    return cache.get(session.id) ?? undefined
  }
}
