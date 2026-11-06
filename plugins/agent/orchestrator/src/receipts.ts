import type { Ledger } from '@sand/ledger/contract'

const keepFor = 7 * 24 * 60 * 60 * 1000

const schema = [['create table thread_starts (request text primary key, thread text not null, at integer not null)']]

export const openReceipts = (ledger: Ledger) => {
  ledger.migrate('orchestrator', schema)
  const found = ledger.db.query<{ thread: string }, { request: string }>('select thread from thread_starts where request = $request')
  const written = ledger.db.query('insert into thread_starts (request, thread, at) values ($request, $thread, $at)')
  const pruned = ledger.db.query('delete from thread_starts where at < $before')

  return {
    get: (request: string) => found.get({ request })?.thread,
    put(request: string, thread: string) {
      const at = Date.now()
      pruned.run({ before: at - keepFor })
      written.run({ request, thread, at })
    },
  }
}

export type Receipts = ReturnType<typeof openReceipts>
