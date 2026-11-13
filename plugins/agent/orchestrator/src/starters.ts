import type { Session } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { Ledger } from '@sand/ledger/contract'

export type Started = 'subagent' | 'thread'

export const openStarters = (ledger: Ledger) => {
  const one = ledger.db.query<ConversationRef, { thread: string }>('select owner, id from thread_starters where thread = $thread')
  const owned = ledger.db.query<{ thread: string; id: string }, { owner: Owner }>('select thread, id from thread_starters where owner = $owner and subagent = 1')
  const written = ledger.db.query('insert or ignore into thread_starters (thread, owner, id, at, subagent) values ($thread, $owner, $id, $at, $subagent)')
  const removed = ledger.db.query('delete from thread_starters where thread = $thread')

  const starterOf = (thread: string) => one.get({ thread }) ?? undefined

  return {
    of: (subagent: Session) => (subagent.kind === 'agent' ? starterOf(subagent.id) : undefined),
    starterOf,
    owned: (owner: Owner) => Object.fromEntries(owned.all({ owner }).map(row => [row.thread, row.id])),
    put: (thread: string, { owner, id }: ConversationRef, started: Started) =>
      written.run({ thread, owner, id, at: Date.now(), subagent: started === 'subagent' ? 1 : 0 }).changes > 0,
    remove: (thread: string) => void removed.run({ thread }),
  }
}

export type Starters = ReturnType<typeof openStarters>
