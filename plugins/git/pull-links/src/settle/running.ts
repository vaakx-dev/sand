import type { Session, Sessions } from '@sand/chats/contract'
import type { Loop } from '@sand/loop/contract'

export const isRunning = (sessions: Sessions, loop: Loop | undefined, thread: Session): boolean => {
  if (!loop) return false
  if (loop.active(thread)) return true
  return sessions.children(thread.id).some(child => {
    const agent = sessions.open(child.id)
    return agent ? isRunning(sessions, loop, agent) : false
  })
}
