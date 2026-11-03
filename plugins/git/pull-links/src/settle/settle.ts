import type { Session, Sessions } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullKey } from '@sand/github/contract'
import type { LinkBook } from '../book/book'
import { refOf, type StoredLinks } from '../book/record'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import type { OnceReport } from '../report/once'
import { readEnded } from './ends'
import { isSettleable, lastEnd } from './rule'
import type { SettleSetting } from './setting'

export interface AutoSettleDeps {
  github: GitHub
  sessions: Sessions
  book: LinkBook
  links: ThreadLinks
  setting: SettleSetting
  failures: OnceReport
  running(thread: Session): boolean
  hold(): () => void
}

const tickMs = 30_000
const checkMs = 5 * 60_000
const refusedMs = 5 * 60_000

const latestMessageAt = (thread: Session) => thread.latest('message')?.at ?? thread.created

const engagedAt = (thread: Session, links: StoredLinks) => links.engaged ?? latestMessageAt(thread)

export const startAutoSettle = (deps: AutoSettleDeps) => {
  const refusedUntil = new Map<string, number>()
  let nextCheck = 0
  let sweeping = false

  const openPulls = () => {
    const found = new Map<string, PullRef>()
    for (const id of deps.book.threads()) {
      const thread = deps.sessions.open(id)
      if (!thread || !isLive(thread)) continue
      for (const link of deps.book.read(id).links) if (link.ended === undefined) found.set(pullKey(link), refOf(link))
    }
    return [...found.values()]
  }

  const checkEnds = async () => {
    const pulls = openPulls()
    const ended = await readEnded(deps.github, pulls, deps.failures)
    for (const pull of pulls) {
      const at = ended.get(pullKey(pull))
      if (at === undefined) continue
      deps.links.recordEnd(pull, at)
      deps.github.summary(pull, true).catch(error => deps.failures.failed(pullKey(pull), error))
    }
  }

  const settleEnded = async (now: number) => {
    for (const id of deps.book.threads()) {
      const links = deps.book.read(id)
      const ended = lastEnd(links)
      if (ended === undefined || (refusedUntil.get(id) ?? 0) > now) continue
      const thread = deps.sessions.open(id)
      if (!thread || !isSettleable(thread, now) || deps.running(thread) || ended <= engagedAt(thread, links)) continue
      await deps.sessions.settle(id, true).catch(() => refusedUntil.set(id, now + refusedMs))
    }
  }

  const sweep = async () => {
    const now = Date.now()
    if (now >= nextCheck) {
      nextCheck = now + checkMs
      await checkEnds()
    }
    await settleEnded(now)
  }

  const tick = async () => {
    if (sweeping || !deps.setting.on()) return
    sweeping = true
    const release = deps.hold()
    try {
      await sweep()
    } finally {
      sweeping = false
      release()
    }
  }

  const timer = setInterval(() => tick().catch(error => deps.failures.failed('settle', error)), tickMs)
  return () => clearInterval(timer)
}
