import type { Session } from '@sand/chats/contract'
import type { GitHub } from '@sand/github/contract'
import type { SubModel } from '@sand/sub-model/contract'
import type { Turns } from '@sand/turns-contract/contract'
import type { OnceReport } from '../report/once'
import type { Wake } from './check'
import { screen } from './screen'

export interface Wakers {
  turns(): Turns | undefined
  sub(): SubModel | undefined
  github: GitHub
  report(error: unknown): void
  failures: OnceReport
  hold(): () => void
}

const wakeAgent = (wakers: Wakers, session: Session, text: string, label: string, id: string): boolean => {
  const turns = wakers.turns()
  if (!turns) return false
  turns.send(session, { prompt: text, label, origin: 'wake', clientRequestId: id }).catch(wakers.report)
  return true
}

export const createWake = (wakers: Wakers) => {
  const stop = new AbortController()
  const running = new Set<string>()
  const wake: Wake = {
    agent: (session, text, label, id) => !stop.signal.aborted && wakeAgent(wakers, session, text, label, id),
    screen() {
      const sub = wakers.sub()
      if (!sub?.has('fast')) return undefined
      return event => screen({ sub, github: wakers.github, signal: stop.signal }, event)
    },
    once(key, run) {
      if (running.has(key)) return
      running.add(key)
      const release = wakers.hold()
      run()
        .catch(wakers.report)
        .finally(() => {
          running.delete(key)
          release()
        })
    },
    failed(key, error) {
      if (!stop.signal.aborted) wakers.failures.failed(key, error)
    },
    passed: key => wakers.failures.passed(key),
  }
  return { wake, stop: () => stop.abort() }
}
