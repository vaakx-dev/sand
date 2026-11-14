import { noteBlock, type Session } from '@sand/chats/contract'
import { errorMessage } from '@sand/util'
import type { WorktreeDeps } from '../deps'
import { notRestoredNote } from '../remove/notes'
import { restoreRecord, waitingThreads } from '../remove/restore'
import { tidyWorktree } from './tidy'

const parkNow = async (deps: WorktreeDeps, session: Session) => {
  await deps.store.ready()
  const record = deps.store.containing(session.cwd)
  if (record) await tidyWorktree(deps, record, Date.now())
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

  const archived = (session: Session) => {
    if (session.kind === 'quick' || !session.archived) return
    const run = parkNow(deps, session)
      .catch(error => deps.report(new Error(`Kept the worktree of an archived thread: ${errorMessage(error)}`)))
      .finally(() => parking.delete(session.id))
    parking.set(session.id, run)
  }

  const resume = async (session: Session) => {
    if (session.kind === 'quick') return
    await parking.get(session.id)
    await resumeNow(deps, session)
  }

  return { archived, resume }
}
