import type { Session, SessionInfo, Sessions } from '@sand/chats/contract'
import type { Orrin } from '@sand/orrin/contract'

export interface Deps {
  sessions: Sessions
  orrin(): Orrin | undefined
}

export const placed = (deps: Deps, chat: Pick<SessionInfo, 'cwd'>) => {
  const orrin = deps.orrin()
  const place = orrin?.available() ? orrin.placeAt(chat.cwd) : undefined
  return orrin && place ? { orrin, place } : undefined
}

export const threadOf = (deps: Deps, session: Session) => {
  const passed = new Set<string>()
  let chat: Session | undefined = session
  while (chat?.kind === 'agent' && chat.parent && !passed.has(chat.id)) {
    passed.add(chat.id)
    chat = deps.sessions.open(chat.parent)
  }
  return chat?.kind === 'thread' ? chat : undefined
}
