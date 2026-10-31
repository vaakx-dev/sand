import type { Session } from '@sand/chats/contract'
import type { PullSummary } from '@sand/github/contract'
import type { PullActivity } from '../activity/types'
import type { StoredLink } from '../book/record'
import type { ThreadLinks } from '../links/links'
import { baselineMark, changesSince, nextMark, onlyTalk, quietLimit, sameMark } from './mark'
import { wakeLabel, wakeNote } from './note'

export type Wake = (session: Session, text: string, label: string) => boolean

export const checkWatched = (links: ThreadLinks, wake: Wake, thread: Session, link: StoredLink, summary: PullSummary, activity: PullActivity) => {
  if (!link.mark) return void links.mark(thread, link, baselineMark(activity), 0, true)
  const quiet = link.quiet ?? 0
  const next = nextMark(link.mark, activity)
  const changes = changesSince(link.mark, activity)
  if (!changes.length) {
    if (!sameMark(next, link.mark)) links.mark(thread, link, next, quiet, true)
    return
  }
  const talk = onlyTalk(changes) ? quiet + 1 : 0
  const stopped = talk >= quietLimit
  if (!wake(thread, wakeNote(summary, changes, stopped), wakeLabel(summary))) return
  links.mark(thread, link, next, talk, !stopped)
}
