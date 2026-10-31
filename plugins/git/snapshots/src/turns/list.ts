import type { Session } from '@sand/chats/contract'
import type { ListedTurn, TurnSnapshot, TurnSnapshots } from '../contract'
import type { SnapshotDeps } from '../deps'
import { sessionRefs, turnRef } from '../git/refs'
import { recordedTurns } from './entries'

const refsIn = async ({ git, repos }: SnapshotDeps, cwd: string, session: string) => {
  const repo = await repos.layout(cwd)
  return new Set(repo ? await sessionRefs(git, repo.root, session) : [])
}

const kept = (turn: TurnSnapshot, refs?: Set<string>) => Boolean(refs?.has(turnRef(turn.session, turn.index, 'before')))

const numbered = (turns: TurnSnapshot[]): ListedTurn[] => {
  let count = 0
  return turns.map(turn => (turn.restored ? turn : { ...turn, number: ++count }))
}

export const listTurns = async (deps: SnapshotDeps, session: Session): Promise<TurnSnapshots> => {
  const turns = numbered(recordedTurns(session))
  const folders = [...new Set(turns.map(turn => turn.cwd))]
  const refs = new Map(await Promise.all(folders.map(async cwd => [cwd, await refsIn(deps, cwd, session.id)] as const)))
  return { session: session.id, turns: turns.filter(turn => kept(turn, refs.get(turn.cwd))) }
}
