import type { Session, Sessions } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullKey } from '@sand/github/contract'
import { readActivity } from '../activity/read'
import type { LinkBook } from '../book/book'
import { refOf } from '../book/record'
import { findLink } from '../links/edit'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import type { OnceReport } from '../report/once'
import { checkWatched, type Wake } from '../watch/check'
import { isEnded, nextDue, retryMs } from './cadence'
import type { Viewed } from './viewed'

export interface SweepDeps {
  github: GitHub
  sessions: Sessions
  book: LinkBook
  links: ThreadLinks
  viewed: Viewed
  wake: Wake
  failures: OnceReport
  hold(): () => void
}

interface Target {
  ref: PullRef
  threads: Session[]
}

const tickMs = 30_000

export const createSweep = (deps: SweepDeps) => {
  const due = new Map<string, number>()
  let running = false

  const wanted = (id: string) => deps.viewed.has(id) || deps.book.read(id).links.some(link => link.watching)

  const targets = () => {
    const found = new Map<string, Target>()
    for (const id of deps.book.threads().filter(wanted)) {
      const thread = deps.sessions.open(id)
      if (!thread) continue
      if (!isLive(thread)) {
        deps.links.stopWatching(thread)
        continue
      }
      const viewed = deps.viewed.has(id)
      for (const link of deps.book.read(id).links) {
        if (!link.watching && !viewed) continue
        const key = pullKey(link)
        const target = found.get(key) ?? { ref: refOf(link), threads: [] }
        target.threads.push(thread)
        found.set(key, target)
      }
    }
    return found
  }

  const watchedIn = (thread: Session, ref: PullRef) => {
    const link = findLink(deps.book.read(thread.id), ref)
    return link?.watching ? link : undefined
  }

  const refresh = async (key: string, target: Target, now: number) => {
    const summary = await deps.github.summary(target.ref, true)
    due.set(key, nextDue(summary, now))
    const watching = target.threads.filter(thread => watchedIn(thread, target.ref))
    if (!watching.length) return
    if (isEnded(summary)) {
      for (const thread of watching) deps.links.stopWatch(thread, target.ref)
      return
    }
    const activity = await readActivity(deps.github, target.ref)
    for (const thread of watching) {
      const link = watchedIn(thread, target.ref)
      if (link) checkWatched(deps.links, deps.wake, thread, link, summary, activity)
    }
  }

  const sweep = async () => {
    const now = Date.now()
    for (const [key, target] of targets()) {
      if ((due.get(key) ?? 0) > now) continue
      await refresh(key, target, now).then(
        () => deps.failures.passed(key),
        error => {
          due.set(key, now + retryMs)
          deps.failures.failed(key, error)
        },
      )
    }
  }

  const tick = async () => {
    if (running) return
    running = true
    const release = deps.hold()
    try {
      await sweep()
    } finally {
      running = false
      release()
    }
  }

  return {
    start() {
      const timer = setInterval(() => tick().catch(error => deps.failures.failed('sweep', error)), tickMs)
      return () => {
        clearInterval(timer)
        due.clear()
      }
    },
    soon: (pull: PullRef) => void due.delete(pullKey(pull)),
  }
}

export type Sweep = ReturnType<typeof createSweep>
