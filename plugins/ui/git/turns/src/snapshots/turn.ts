import type { DiffScope } from '@sand/git-diff/contract'
import type { ListedTurn, SnapshotSide } from '@sand/git-snapshots/contract'
import { ago, samePath } from '@sand/util'

export type FinishedTurn = ListedTurn & { after: string }

export const hasChanges = (snapshot: ListedTurn | undefined): snapshot is FinishedTurn => Boolean(snapshot?.after && snapshot.files > 0)

export const turnScopeId = (snapshot: ListedTurn) => `git-turns:${snapshot.session}:${snapshot.turn}`

export const rangeOf = (snapshot: FinishedTurn): DiffScope => ({ kind: 'range', from: snapshot.before, to: snapshot.after })

export const turnOrdinal = (snapshot: ListedTurn) => (snapshot.number ? `turn ${snapshot.number}` : 'this turn')

export const turnName = (snapshot: ListedTurn, turns: ListedTurn[]) => {
  const restored = snapshot.restored
  if (!restored) return snapshot.number ? `Turn ${snapshot.number}` : 'Turn'
  const target = turns.find(turn => turn.turn === restored.turn)
  return target?.number ? `Restored to ${restored.to} turn ${target.number}` : 'Restored files'
}

export const inFolder = (snapshot: ListedTurn, cwd: string) => samePath(snapshot.cwd, cwd)

export const agoText = (at: number) => {
  const when = ago(at)
  return when === 'now' ? 'just now' : `${when} ago`
}

export const latestRestore = (turns: ListedTurn[], turn: string, to: SnapshotSide) =>
  turns.filter(snapshot => snapshot.restored?.turn === turn && snapshot.restored.to === to).at(-1)
