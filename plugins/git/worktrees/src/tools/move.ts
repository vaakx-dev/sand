import type { Session } from '@sand/chats/contract'
import type { TurnResult, Turns } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import { moveThread } from '../move/move'
import { repoAt } from '../repo/local'
import { threadsIn } from '../sessions/inside'

interface PendingMove {
  branch?: string
  task?: string
}

export const checkMovable = async (deps: WorktreeDeps, session: Session) => {
  if (session.kind !== 'thread') throw new Error("Only a thread's own agent can move it into a worktree.")
  const local = await repoAt(deps.repos, session.cwd)
  const others = threadsIn(deps.sessions, local.root).filter(other => other.id !== session.id && deps.busy(other.id))
  if (others.length) throw new Error(`Another thread is working in ${local.root}, and its uncommitted changes would move too. Start a new thread in a worktree instead.`)
}

const moved = async (deps: WorktreeDeps, session: Session, { branch, task }: PendingMove) => {
  try {
    await checkMovable(deps, session)
    await moveThread(deps, { session: session.id, carry: true, ...(branch ? { branch } : {}) })
    return task
  } catch (error) {
    return `Couldn't move this thread into a worktree: ${errorMessage(error)}`
  }
}

export const createMoves = (deps: WorktreeDeps, turns: () => Turns | undefined, hold: () => () => void) => {
  const pending = new Map<string, PendingMove>()

  const carryOn = async (session: Session, move: PendingMove) => {
    const release = hold()
    const text = await moved(deps, session, move).finally(release)
    const running = turns()
    if (text && running) await running.run(deps.sessions.require(session.id), text, { origin: 'agent' })
  }

  return {
    queue: (session: string, move: PendingMove) => pending.set(session, move),
    ended(session: Session, result: TurnResult) {
      const move = pending.get(session.id)
      if (!move) return
      pending.delete(session.id)
      if (result.stopReason !== 'interrupted') carryOn(session, move).catch(deps.report)
    },
  }
}

export type Moves = ReturnType<typeof createMoves>
