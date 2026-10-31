import type { Sessions } from '@sand/chats/contract'
import type { GitLocal, GitRepo } from '@sand/git/contract'
import type { Dispose } from 'drydock'
import { isLive } from '../links/thread'
import type { Discovery } from './discovery'

export interface FollowDeps {
  repos: GitRepo
  sessions: Sessions
  discovery: Discovery
}

interface Followed {
  cwd: string
  stop: Dispose
}

const branchOf = (local: GitLocal) => (local.repo && !local.detached ? local.branch : undefined)

export const createBranchFollow = (deps: FollowDeps) => {
  const followed = new Map<string, Followed>()

  const unfollow = (session: string) => {
    followed.get(session)?.stop()
    followed.delete(session)
  }

  const moved = (session: string) => {
    const thread = deps.sessions.open(session)
    if (thread) deps.discovery.revisit(thread)
  }

  const follow = (session: string) => {
    const thread = deps.sessions.open(session)
    if (!thread || !isLive(thread)) return unfollow(session)
    if (followed.get(session)?.cwd === thread.cwd) return
    unfollow(session)
    let branch: string | undefined
    const stop = deps.repos.watchLocal(thread.cwd, local => {
      const next = branchOf(local)
      if (next === branch) return
      branch = next
      if (next) moved(session)
    })
    followed.set(session, { cwd: thread.cwd, stop })
  }

  return {
    follow,
    unfollow,
    close() {
      for (const { stop } of followed.values()) stop()
      followed.clear()
    },
  }
}

export type BranchFollow = ReturnType<typeof createBranchFollow>
