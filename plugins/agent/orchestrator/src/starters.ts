import type { SessionInfo, Sessions } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { Ledger } from '@sand/ledger/contract'

const startedAgent = <T extends SessionInfo>(info: T | undefined): info is T & { parent: string } => info?.kind === 'agent' && info.parent !== null

export const openStarters = (ledger: Ledger, sessions: Sessions) => {
  const one = ledger.db.query<ConversationRef, { thread: string }>('select owner, id from thread_starters where thread = $thread')
  const owned = ledger.db.query<{ thread: string; id: string }, { owner: Owner }>('select thread, id from thread_starters where owner = $owner')
  const written = ledger.db.query('insert or ignore into thread_starters (thread, owner, id, at) values ($thread, $owner, $id, $at)')
  const removed = ledger.db.query('delete from thread_starters where thread = $thread')

  const parentOf = (thread: string): ConversationRef | undefined => {
    const session = sessions.open(thread)
    return startedAgent(session) ? { owner: 'thread', id: session.parent } : undefined
  }

  const agents = (owner: Owner) => (owner === 'thread' ? sessions.list().filter(startedAgent).map(agent => [agent.id, agent.parent] as const) : [])

  return {
    of: (thread: string) => one.get({ thread }) ?? parentOf(thread),
    owned: (owner: Owner) => Object.fromEntries([...owned.all({ owner }).map(row => [row.thread, row.id] as const), ...agents(owner)]),
    put: (thread: string, { owner, id }: ConversationRef) => written.run({ thread, owner, id, at: Date.now() }).changes > 0,
    remove: (thread: string) => void removed.run({ thread }),
  }
}

export type Starters = ReturnType<typeof openStarters>
