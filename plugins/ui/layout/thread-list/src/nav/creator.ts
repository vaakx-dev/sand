import type { NavItem } from '@sand/protocol'
import type { Thread, Threads } from '@sand/web-client/contract'

export type CreatorOf = (thread: Thread) => NavItem['creator']

export const creatorOf =
  (threads: Threads): CreatorOf =>
  thread => {
    const link = thread.info.creator
    if (!link) return undefined
    const agent = threads.get(link.session)
    if (!agent) return { label: `Started by an agent on ${link.name}` }
    return { label: `Started by the agent in "${agent.info.title ?? 'Untitled thread'}"`, open: () => void threads.select(link.session) }
  }
