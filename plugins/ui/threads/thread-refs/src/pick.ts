import type { ChatKind, SessionSummary } from '@sand/chats/contract'
import { matching } from '@sand/util'

const LINKABLE_KINDS = new Set<ChatKind>(['thread', 'quick'])

export type Listed = Pick<SessionSummary, 'id' | 'title' | 'kind' | 'updated' | 'cwd'>

export const pickThreads = <T extends Listed>(threads: T[], query: string, current?: string) => {
  const linkable = threads.filter(thread => thread.id !== current && LINKABLE_KINDS.has(thread.kind) && thread.title).sort((a, b) => b.updated - a.updated)
  return matching(
    linkable.map(thread => thread.title),
    query,
    true,
  ).map(index => linkable[index]!)
}
