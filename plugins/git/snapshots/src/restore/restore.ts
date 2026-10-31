import type { Session } from '@sand/chats/contract'
import type { SnapshotSide, TurnSnapshot, TurnSnapshots } from '../contract'
import type { SnapshotDeps } from '../deps'
import { captureSnapshot } from '../git/capture'
import { pruneSessionRefs, turnRef, writeTurnRef } from '../git/refs'
import { statBetween } from '../git/stat'
import { nextIndex, recordTurn } from '../turns/entries'
import { listTurns } from '../turns/list'
import { checkoutSnapshot } from './checkout'
import { ignoredInTheWay, refuseUnmerged } from './guard'

export interface RestoreRequest {
  session: string
  turn: string
  to: SnapshotSide
}

const targetOf = async (deps: SnapshotDeps, session: Session, { turn, to }: RestoreRequest) => {
  const found = (await listTurns(deps, session)).turns.find(snapshot => snapshot.turn === turn)
  if (!found) throw new Error('This chat has no snapshot for that turn any more.')
  const commit = to === 'before' ? found.before : found.after
  if (!commit) throw new Error('That turn has no snapshot from when it ended.')
  return { snapshot: found, commit }
}

const restoreIn = async (deps: SnapshotDeps, session: Session, root: string, target: TurnSnapshot, commit: string, request: RestoreRequest) => {
  const { git } = deps
  if (deps.busyIn(root)) throw new Error('Stop the chats working in this folder before restoring files.')
  await refuseUnmerged(git, root)
  const ignored = await ignoredInTheWay(git, root, commit)
  const index = nextIndex(session)
  const saved = await captureSnapshot(git, root, `sand snapshot ${session.id} turn ${index} before restore`, ignored)
  await writeTurnRef(git, root, turnRef(session.id, index, 'before'), saved)
  await writeTurnRef(git, root, turnRef(session.id, index, 'after'), commit)
  recordTurn(session, {
    session: session.id,
    turn: crypto.randomUUID(),
    index,
    at: Date.now(),
    cwd: target.cwd,
    before: saved,
    after: commit,
    ...(await statBetween(git, root, saved, commit)),
    restored: { turn: request.turn, to: request.to },
  })
  await checkoutSnapshot(git, root, commit, saved)
  await pruneSessionRefs(git, root, session.id)
}

export const restoreTurn = async (deps: SnapshotDeps, request: RestoreRequest): Promise<TurnSnapshots> => {
  const session = deps.sessions.require(request.session)
  const { snapshot, commit } = await targetOf(deps, session, request)
  const repo = await deps.repos.layout(snapshot.cwd)
  if (!repo) throw new Error(`${snapshot.cwd} is no longer a git repository.`)
  const { root } = repo
  try {
    await deps.queue(root, () => restoreIn(deps, session, root, snapshot, commit, request))
  } finally {
    deps.refresh(snapshot.cwd)
    deps.changed(session)
  }
  return listTurns(deps, session)
}
