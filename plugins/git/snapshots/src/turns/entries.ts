import type { Session } from '@sand/chats/contract'
import type { TurnSnapshot } from '../contract'

export const snapshotEntry = 'turn-snapshot'

export const recordedTurns = (session: Session): TurnSnapshot[] => {
  const turns = new Map<string, TurnSnapshot>()
  for (const entry of session.entries()) {
    if (entry.type !== snapshotEntry) continue
    const snapshot = entry.data as TurnSnapshot
    turns.set(snapshot.turn, snapshot)
  }
  return [...turns.values()].sort((a, b) => a.index - b.index)
}

export const nextIndex = (session: Session) => Math.max(0, ...recordedTurns(session).map(turn => turn.index)) + 1

export const recordTurn = (session: Session, snapshot: TurnSnapshot) => session.append(snapshotEntry, snapshot)
