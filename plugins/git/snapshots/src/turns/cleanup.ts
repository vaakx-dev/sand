import type { Session } from '@sand/chats/contract'
import type { SnapshotDeps } from '../deps'
import { deleteSessionRefs } from '../git/refs'
import { findRepo } from '../git/repo'
import { recordedTurns } from './entries'

const foldersOf = (session: Session) => [...new Set([session.cwd, ...recordedTurns(session).map(turn => turn.cwd)])]

export const createCleanup = ({ git, sessions, queue }: SnapshotDeps) => {
  const leaving = new Map<string, string[]>()

  const note = (session: Session) => {
    leaving.set(session.id, foldersOf(session))
    for (const child of sessions.children(session.id)) {
      const opened = sessions.open(child.id)
      if (opened) note(opened)
    }
  }

  const removeIn = async (cwd: string, session: string) => {
    const repo = await findRepo(git, cwd)
    if (repo) await queue(repo.root, () => deleteSessionRefs(git, repo.root, session))
  }

  const remove = async (session: string) => {
    const folders = leaving.get(session) ?? []
    leaving.delete(session)
    await Promise.all(folders.map(cwd => removeIn(cwd, session)))
  }

  return { note, remove }
}
