import type { Session } from '@sand/chats/contract'
import type { GitRepo } from '@sand/git/contract'
import type { GitHub } from '@sand/github/contract'
import type { LinkBook } from '../book/book'
import { findLink, isDismissed } from '../links/edit'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import type { OnceReport } from '../report/once'
import { isEnded } from '../sweep/cadence'

export interface DiscoveryDeps {
  github: GitHub
  repos: GitRepo
  book: LinkBook
  links: ThreadLinks
  failures: OnceReport
}

interface Pending {
  timer: Timer
  gap: number
}

const settleMs = 2_000
const afterTurnGapMs = 20_000
const revisitGapMs = 5 * 60_000

export const createDiscovery = (deps: DiscoveryDeps) => {
  const pending = new Map<string, Pending>()
  const looked = new Map<string, { branch: string; at: number }>()

  const look = async (thread: Session, gap: number) => {
    const { local } = await deps.repos.status(thread.cwd)
    if (!local.repo || !local.branch || local.detached || local.isDefault) return
    const last = looked.get(thread.id)
    const now = Date.now()
    if (last?.branch === local.branch && now - last.at < gap) return
    looked.set(thread.id, { branch: local.branch, at: now })
    const pull = await deps.github.forBranch(thread.cwd)
    if (!pull || isEnded(pull)) return
    const stored = deps.book.read(thread.id)
    if (findLink(stored, pull) || isDismissed(stored, pull)) return
    await deps.links.link(thread.id, pull, 'branch')
  }

  const soon = (thread: Session, gap: number) => {
    if (!isLive(thread)) return
    const held = pending.get(thread.id)
    if (held) clearTimeout(held.timer)
    const wait = Math.min(gap, held?.gap ?? gap)
    const timer = setTimeout(() => {
      pending.delete(thread.id)
      look(thread, wait).then(
        () => deps.failures.passed(`branch:${thread.id}`),
        error => deps.failures.failed(`branch:${thread.id}`, error),
      )
    }, settleMs)
    pending.set(thread.id, { timer, gap: wait })
  }

  return {
    now: (thread: Session) => (isLive(thread) ? look(thread, 0) : Promise.resolve()),
    afterTurn: (thread: Session) => soon(thread, afterTurnGapMs),
    revisit: (thread: Session) => soon(thread, revisitGapMs),
    close() {
      for (const { timer } of pending.values()) clearTimeout(timer)
      pending.clear()
      looked.clear()
    },
  }
}

export type Discovery = ReturnType<typeof createDiscovery>
