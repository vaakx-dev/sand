import type { Session } from '@sand/sessions-sqlite/contract'

export interface AgentMeta {
  name: string
  depth: number
  system: string
}

export type Meta = (session: Session) => AgentMeta | undefined

export const createMeta = (): Meta => {
  const cache = new Map<string, AgentMeta | null>()
  return session => {
    if (!cache.has(session.id)) {
      const entry = session.kind === 'agent' ? session.path().find(candidate => candidate.type === 'agent') : undefined
      cache.set(session.id, (entry?.data as AgentMeta | undefined) ?? null)
    }
    return cache.get(session.id) ?? undefined
  }
}
