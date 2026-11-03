import type { Session, Sessions } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullKey } from '@sand/github/contract'
import type { LinkBook } from '../book/book'
import { refOf, type StoredLinks } from '../book/record'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import type { OnceReport } from '../report/once'
import { readEnds } from './ends'
import { allEndedAt, mayAutoSettle, settlesAt } from './rule'
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

export const createAutoSettle = (deps: AutoSettleDeps) => {
  const refused = new Map<string, number>()
  const lastMessage = new Map<string, number>()
  let nextCheck = 0
  let busy = false

  const liveThreads = () =>
    deps.book.threads().flatMap(id => {
      const thread = deps.sessions.open(id)
      return thread && isLive(thread) ? [thread] : []
    })

  const openPulls = () => {
    const found = new Map<string, PullRef>()
    for (const thread of liveThreads()) for (const link of deps.book.read(thread.id).links) if (link.ended === undefined) found.set(pullKey(link), refOf(link))
    return [...found.values()]
  }

  const check = async () => {
    const pulls = openPulls()
    if (!pulls.length) return
    const ends = await readEnds(deps.github, pulls, (pull, error) => deps.failures.failed(`ends:${pullKey(pull)}`, error))
    for (const pull of pulls) {
      const key = pullKey(pull)
      if (!ends.has(key)) continue
      deps.failures.passed(`ends:${key}`)
      const ended = ends.get(key)
      if (ended === undefined) continue
      deps.links.ended(pull, ended)
      deps.github.summary(pull, true).catch(error => deps.failures.failed(key, error))
    }
  }

  const lastMessageAt = (thread: Session) => {
    const known = lastMessage.get(thread.id)
    if (known !== undefined) return known
    const at = thread.latest('message')?.at ?? thread.created
    lastMessage.set(thread.id, at)
    return at
  }

  // Links stored before auto-settle have no held time, so the latest message stands in for the user's.
  const heldOf = (thread: Session, links: StoredLinks) => links.held ?? lastMessageAt(thread)

  const settleEnded = async (now: number) => {
    for (const id of deps.book.threads()) {
      const links = deps.book.read(id)
      if (allEndedAt(links) === undefined || (refused.get(id) ?? 0) > now) continue
      const thread = deps.sessions.open(id)
      if (!thread || !mayAutoSettle(thread, now) || deps.running(thread)) continue
      if (settlesAt(links, heldOf(thread, links)) === undefined) continue
      await deps.sessions.settle(id, true).catch(() => refused.set(id, now + refusedMs))
    }
  }

  const sweep = async () => {
    const now = Date.now()
    if (now >= nextCheck) {
      nextCheck = now + checkMs
      await check().catch(error => deps.failures.failed('ends', error))
    }
    await settleEnded(now)
  }

  const tick = async () => {
    if (busy || !deps.setting.on()) return
    busy = true
    const release = deps.hold()
    try {
      await sweep()
    } finally {
      busy = false
      release()
    }
  }

  return {
    start() {
      const timer = setInterval(() => tick().catch(error => deps.failures.failed('settle', error)), tickMs)
      return () => {
        clearInterval(timer)
        nextCheck = 0
      }
    },
    soon: () => void (nextCheck = 0),
    forget(id: string) {
      refused.delete(id)
      lastMessage.delete(id)
    },
  }
}

export type AutoSettle = ReturnType<typeof createAutoSettle>
