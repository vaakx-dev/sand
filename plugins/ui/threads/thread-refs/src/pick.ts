import type { SessionSummary } from '@sand/chats/contract'
import { matching } from '@sand/util'

export type Listed = Pick<SessionSummary, 'id' | 'title' | 'kind' | 'updated' | 'cwd'>

export const pickThreads = <T extends Listed>(threads: T[], query: string, current?: string) => {
  const linkable = threads.filter(thread => thread.id !== current && thread.kind !== 'agent' && thread.title).sort((a, b) => b.updated - a.updated)
  return matching(
    linkable.map(thread => thread.title),
    query,
    true,
  ).map(index => linkable[index]!)
}
