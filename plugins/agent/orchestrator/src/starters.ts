import type { Session } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import type { Ledger } from '@sand/ledger/contract'

export const openStarters = (ledger: Ledger) => {
  const one = ledger.db.query<ConversationRef, { thread: string }>('select owner, id from thread_starters where thread = $thread')
  const owned = ledger.db.query<{ thread: string; id: string }, { owner: Owner }>('select thread, id from thread_starters where owner = $owner')
  const written = ledger.db.query('insert or ignore into thread_starters (thread, owner, id, at) values ($thread, $owner, $id, $at)')
  const removed = ledger.db.query('delete from thread_starters where thread = $thread')

  return {
    of: (subagent: Session) => (subagent.kind === 'agent' ? (one.get({ thread: subagent.id }) ?? undefined) : undefined),
    owned: (owner: Owner) => Object.fromEntries(owned.all({ owner }).map(row => [row.thread, row.id])),
    put: (subagent: string, { owner, id }: ConversationRef) => written.run({ thread: subagent, owner, id, at: Date.now() }).changes > 0,
    remove: (thread: string) => void removed.run({ thread }),
  }
}

export type Starters = ReturnType<typeof openStarters>
