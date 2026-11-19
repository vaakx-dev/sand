import type { Session } from '@sand/chats/contract'
import type { Owner } from '@sand/engine/contract'
import type { Ledger } from '@sand/ledger/contract'
import type { Starter } from './contract'

export type Started = 'subagent' | 'thread'

interface Row {
  owner: Owner
  id: string
  pc: string | null
}

const starterOf = ({ owner, id, pc }: Row): Starter => ({ owner, id, ...(pc && { pc }) })

export const openStarters = (ledger: Ledger) => {
  const one = ledger.db.query<Row, { thread: string }>('select owner, id, pc from thread_starters where thread = $thread')
  const owned = ledger.db.query<{ thread: string; id: string }, { owner: Owner }>('select thread, id from thread_starters where owner = $owner and subagent = 1')
  const away = ledger.db.query<{ thread: string; pc: string }, { id: string }>('select thread, pc from thread_starters where id = $id and pc is not null')
  const written = ledger.db.query('insert or ignore into thread_starters (thread, owner, id, at, subagent, pc) values ($thread, $owner, $id, $at, $subagent, $pc)')
  const removed = ledger.db.query('delete from thread_starters where thread = $thread')

  const starter = (thread: string) => {
    const row = one.get({ thread })
    return row ? starterOf(row) : undefined
  }

  return {
    of: (subagent: Session) => (subagent.kind === 'agent' ? starter(subagent.id) : undefined),
    starterOf: starter,
    owned: (owner: Owner) => Object.fromEntries(owned.all({ owner }).map(row => [row.thread, row.id])),
    elsewhere: (starter: string) => away.all({ id: starter }),
    put: (thread: string, { owner, id, pc }: Starter, started: Started) =>
      written.run({ thread, owner, id, at: Date.now(), subagent: started === 'subagent' ? 1 : 0, pc: pc ?? null }).changes > 0,
    remove: (thread: string) => void removed.run({ thread }),
  }
}

export type Starters = ReturnType<typeof openStarters>
