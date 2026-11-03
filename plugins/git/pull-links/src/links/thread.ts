import type { Session, SessionInfo, Sessions } from '@sand/chats/contract'

export const threadOf = (sessions: Sessions, id: string): Session => {
  const session = sessions.require(id)
  if (session.kind !== 'agent' || !session.parent) return session
  return threadOf(sessions, session.parent)
}

export const isLive = (session: Pick<SessionInfo, 'kind' | 'settled'>) => session.kind === 'thread' && session.settled === null
