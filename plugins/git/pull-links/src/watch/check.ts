import type { Session } from '@sand/chats/contract'
import { type PullSummary, pullKey } from '@sand/github/contract'
import type { PullActivity } from '../activity/types'
import type { StoredLink, WatchMark } from '../book/record'
import { findLink } from '../links/edit'
import type { ThreadLinks } from '../links/links'
import { baselineMark, changesSince, nextMark, onlyTalk, quietLimit, sameMark } from './mark'
import { wakeLabel, wakeNote } from './note'
import type { Verdict, WatchEvent } from './screen'

export interface Wake {
  agent(session: Session, text: string, label: string): boolean
  screen(): ((event: WatchEvent) => Promise<Verdict>) | undefined
  once(key: string, run: () => Promise<void>): void
  failed(key: string, error: unknown): void
  passed(key: string): void
}

const unchanged = (links: ThreadLinks, thread: Session, link: StoredLink, mark: WatchMark) => {
  const now = findLink(links.read(thread.id), link)
  return Boolean(now?.watching && now.mark && sameMark(now.mark, mark))
}

export const checkWatched = (links: ThreadLinks, wake: Wake, thread: Session, link: StoredLink, summary: PullSummary, activity: PullActivity) => {
  const mark = link.mark
  if (!mark) return void links.mark(thread, link, baselineMark(activity), 0, true)
  const quiet = link.quiet ?? 0
  const next = nextMark(mark, activity)
  const changes = changesSince(mark, activity)
  if (!changes.length) {
    if (!sameMark(next, mark)) links.mark(thread, link, next, quiet, true)
    return
  }
  const talk = onlyTalk(changes) ? quiet + 1 : 0
  const stopped = talk >= quietLimit
  const wakeWith = (cause?: string) => {
    if (wake.agent(thread, wakeNote(summary, changes, stopped, cause), wakeLabel(summary))) links.mark(thread, link, next, talk, !stopped)
  }
  const screen = wake.screen()
  if (!screen) return wakeWith()
  const failure = `screen:${pullKey(link)}`
  wake.once(`${thread.id} ${pullKey(link)}`, async () => {
    const verdict = await screen({ thread, summary, head: activity.head, mark, changes }).then(
      found => {
        wake.passed(failure)
        return found
      },
      (error: unknown) => {
        wake.failed(failure, error)
        return undefined
      },
    )
    if (!unchanged(links, thread, link, mark)) return
    if (!verdict) return wakeWith()
    if (verdict.wake) return wakeWith(verdict.cause)
    links.mark(thread, link, next, quiet, true)
  })
}
