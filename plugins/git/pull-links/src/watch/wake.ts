import type { Session } from '@sand/chats/contract'
import type { Loop } from '@sand/loop/contract'
import type { Steering } from '@sand/steering/contract'

export interface Wakers {
  loop(): Loop | undefined
  steering(): Steering | undefined
  report(error: unknown): void
}

export const wakeAgent = (wakers: Wakers, session: Session, text: string, label: string): boolean => {
  const loop = wakers.loop()
  if (!loop) return false
  if (loop.active(session)) return Boolean(wakers.steering()?.steer(session, text, label))
  loop.run(session, text).catch(wakers.report)
  return true
}
