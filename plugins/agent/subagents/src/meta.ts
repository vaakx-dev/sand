import type { Conversation } from '@sand/engine/contract'
import type { AgentMeta } from '@sand/orchestrator/contract'

export type Meta = (conversation: Conversation) => AgentMeta | undefined

export const createMeta = (): Meta => {
  const cache = new Map<string, AgentMeta | null>()
  const read = (conversation: Conversation) => (conversation.path().findLast(entry => entry.type === 'agent')?.data as AgentMeta | undefined) ?? null
  return conversation => {
    if (!cache.has(conversation.id)) cache.set(conversation.id, read(conversation))
    return cache.get(conversation.id) ?? undefined
  }
}
