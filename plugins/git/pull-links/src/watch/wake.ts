import type { Session } from '@sand/chats/contract'
import type { GitHub } from '@sand/github/contract'
import type { Loop } from '@sand/loop/contract'
import type { Steering } from '@sand/steering/contract'
import type { SubModel } from '@sand/sub-model/contract'
import type { Wake } from './check'
import { screen } from './screen'

export interface Wakers {
  loop(): Loop | undefined
  steering(): Steering | undefined
  sub(): SubModel | undefined
  github: GitHub
  report(error: unknown): void
}

const wakeAgent = (wakers: Wakers, session: Session, text: string, label: string): boolean => {
  const loop = wakers.loop()
  if (!loop) return false
  if (loop.active(session)) return Boolean(wakers.steering()?.steer(session, text, label))
  loop.run(session, text).catch(wakers.report)
  return true
}

export const createWake = (wakers: Wakers) => {
  const stop = new AbortController()
  const running = new Set<string>()
  const wake: Wake = {
    agent: (session, text, label) => !stop.signal.aborted && wakeAgent(wakers, session, text, label),
    screen() {
      const sub = wakers.sub()
      if (!sub?.has('fast')) return undefined
      return event => screen({ sub, github: wakers.github, signal: stop.signal }, event)
    },
    once(key, run) {
      if (running.has(key)) return
      running.add(key)
      run()
        .catch(wakers.report)
        .finally(() => running.delete(key))
    },
    report(error) {
      if (!stop.signal.aborted) wakers.report(error)
    },
  }
  return { wake, stop: () => stop.abort() }
}
