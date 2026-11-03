import type { Session, Sessions } from '@sand/chats/contract'

export const threadOf = (sessions: Sessions, id: string): Session => {
  const session = sessions.require(id)
  if (session.kind !== 'agent' || !session.parent) return session
  return threadOf(sessions, session.parent)
}

export const isLive = (session: Session) => session.kind === 'thread' && session.settled === null
