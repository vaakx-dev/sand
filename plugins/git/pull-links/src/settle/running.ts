import type { Session, Sessions } from '@sand/chats/contract'
import type { Turns } from '@sand/turns-contract/contract'

export const isRunning = (sessions: Sessions, turns: Turns | undefined, thread: Session): boolean => {
  if (!turns) return false
  if (turns.current(thread)) return true
  return sessions.children(thread.id).some(child => {
    const agent = sessions.open(child.id)
    return agent ? isRunning(sessions, turns, agent) : false
  })
}
