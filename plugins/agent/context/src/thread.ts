import type { Sessions } from '@sand/chats/contract'
import type { ContextKind } from './contract'

export const threadKind = (sessions: Sessions): ContextKind => ({
  kind: 'thread',
  title: 'Thread',
  project({ data }) {
    const thread = typeof data.id === 'string' ? sessions.open(data.id) : undefined
    return thread ? { body: `Thread ${thread.id}, titled "${thread.title}".` } : { unavailable: 'Thread not found.' }
  },
})
