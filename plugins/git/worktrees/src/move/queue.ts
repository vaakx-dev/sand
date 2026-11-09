import type { Session } from '@sand/chats/contract'
import type { TurnResult, Turns } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import { repoAt } from '../repo/local'
import { threadsIn } from '../sessions/inside'
import { moveThread } from './move'

const checkMovable = async (deps: WorktreeDeps, session: Session) => {
  if (session.kind !== 'thread') throw new Error('Only threads move into worktrees.')
  const local = await repoAt(deps.repos, session.cwd)
  const others = threadsIn(deps.sessions, local.root).filter(other => other.id !== session.id && deps.busy(other.id))
  if (others.length) throw new Error(`Another thread is working in ${local.root}, and its uncommitted changes would move too. Start a new thread in a worktree instead.`)
}

const request = (session: string, branch: string | undefined) => ({ session, carry: true, ...(branch ? { branch } : {}) })

const failure = async (deps: WorktreeDeps, session: Session, branch: string | undefined) => {
  try {
    await checkMovable(deps, session)
    await moveThread(deps, request(session.id, branch))
    return undefined
  } catch (error) {
    return `Couldn't move this thread into a worktree: ${errorMessage(error)}`
  }
}

export const createMoves = (deps: WorktreeDeps, turns: () => Turns | undefined, hold: () => () => void) => {
  const pending = new Map<string, string | undefined>()

  const moveLater = async (session: Session, branch: string | undefined) => {
    const release = hold()
    const failed = await failure(deps, session, branch).finally(release)
    const running = turns()
    if (failed && running) await running.run(deps.sessions.require(session.id), failed, { origin: 'agent' })
  }

  return {
    async move(id: string, branch?: string) {
      const session = deps.sessions.require(id)
      await checkMovable(deps, session)
      if (turns()?.current(session)) pending.set(id, branch)
      else await moveThread(deps, request(id, branch))
    },
    ended(session: Session, result: TurnResult) {
      if (!pending.has(session.id)) return
      const branch = pending.get(session.id)
      pending.delete(session.id)
      if (result.stopReason !== 'interrupted') moveLater(session, branch).catch(deps.report)
    },
  }
}
