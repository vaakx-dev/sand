import type { Session, Sessions } from '@sand/chats/contract'
import type { ContextKind } from './contract'

const sentBy = (thread: Session, to: Session) => {
  const from = `This message is from the agent working in the user's thread "${thread.title}" (id ${thread.id}), not from the user.`
  if (to.kind === 'agent') return from
  return `${from} Your reply stays in this chat; if it asks to hear back, message it with thread_send.`
}

export const threadKind = (sessions: Sessions): ContextKind => ({
  kind: 'thread',
  title: 'Thread',
  project({ data }, to) {
    const thread = typeof data.id === 'string' ? sessions.open(data.id) : undefined
    if (!thread) return { unavailable: 'Thread not found.' }
    return { body: data.sent ? sentBy(thread, to) : `Thread ${thread.id}, titled "${thread.title}".` }
  },
})
