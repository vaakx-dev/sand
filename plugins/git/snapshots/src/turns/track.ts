import type { Session } from '@sand/chats/contract'
import type { GitLayout } from '@sand/git/contract'
import type { TurnSnapshot } from '../contract'
import type { SnapshotDeps } from '../deps'
import { captureSnapshot } from '../git/capture'
import { pruneSessionRefs, turnRef, writeTurnRef } from '../git/refs'
import { statBetween } from '../git/stat'
import { nextIndex, recordTurn } from './entries'

interface OpenTurn {
  repo: GitLayout
  snapshot: TurnSnapshot
}

export const createTurnTracker = ({ git, repos, queue, changed }: SnapshotDeps) => {
  const open = new Map<string, OpenTurn>()

  const begin = async (session: Session, turn: string) => {
    const repo = await repos.layout(session.cwd)
    if (!repo) return
    const snapshot = await queue(repo.root, async (): Promise<TurnSnapshot> => {
      const index = nextIndex(session)
      const before = await captureSnapshot(git, repo.root, `sand snapshot ${session.id} turn ${index} before`)
      await writeTurnRef(git, repo.root, turnRef(session.id, index, 'before'), before)
      const started: TurnSnapshot = { session: session.id, turn, index, at: Date.now(), cwd: session.cwd, before, files: 0, add: 0, del: 0 }
      recordTurn(session, started)
      return started
    })
    open.set(session.id, { repo, snapshot })
    changed(session)
  }

  const end = async (session: Session) => {
    const running = open.get(session.id)
    if (!running) return
    open.delete(session.id)
    const { repo, snapshot } = running
    await queue(repo.root, async () => {
      const after = await captureSnapshot(git, repo.root, `sand snapshot ${session.id} turn ${snapshot.index} after`)
      await writeTurnRef(git, repo.root, turnRef(session.id, snapshot.index, 'after'), after)
      recordTurn(session, { ...snapshot, after, ...(await statBetween(git, repo.root, snapshot.before, after)) })
      await pruneSessionRefs(git, repo.root, session.id)
    })
    changed(session)
  }

  return { begin, end }
}
