import { noteBlock, type Session } from '@sand/chats/contract'
import { errorMessage } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import { notRestoredNote, parkedNote } from '../remove/notes'
import { removeWorktree } from '../remove/remove'
import { restoreRecord, waitingThreads } from '../remove/restore'
import { threadsIn } from '../sessions/inside'

const onlyThread = (deps: WorktreeDeps, path: string, id: string) => {
  const inside = threadsIn(deps.sessions, path)
  return inside.length === 1 && inside[0]?.id === id
}

const parkNow = async (deps: WorktreeDeps, session: Session) => {
  await deps.store.ready()
  const record = deps.store.containing(session.cwd)
  if (!record || !session.settled || !onlyThread(deps, record.path, session.id)) return
  const result = await removeWorktree(deps, { path: record.path }, parkedNote)
  if (!result.removed) return
  record.parked = true
  await deps.store.save()
}

const parkedFor = (deps: WorktreeDeps, session: Session) =>
  deps.store.all().find(record => record.parked && record.removed && waitingThreads(deps, record).includes(session.id))

const resumeNow = async (deps: WorktreeDeps, session: Session) => {
  await deps.store.ready()
  const record = parkedFor(deps, session)
  if (!record) return
  try {
    await restoreRecord(deps, record, [session.id])
  } catch (error) {
    session.append('message', { role: 'user', content: [noteBlock('sand', notRestoredNote(record, session.cwd, errorMessage(error)))] })
    deps.report(error)
    delete record.parked
    await deps.store.save()
  }
}

export const createParking = (deps: WorktreeDeps) => {
  const parking = new Map<string, Promise<void>>()

  const settled = (session: Session) => {
    if (session.kind !== 'thread' || !session.settled) return
    const run = parkNow(deps, session)
      .catch(error => deps.report(new Error(`Kept the worktree of a settled thread: ${errorMessage(error)}`)))
      .finally(() => parking.delete(session.id))
    parking.set(session.id, run)
  }

  const resume = async (session: Session) => {
    if (session.kind !== 'thread') return
    await parking.get(session.id)
    await resumeNow(deps, session)
  }

  return { settled, resume }
}
