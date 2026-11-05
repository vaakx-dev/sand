import type { SendResult } from '@sand/turns-contract/contract'
import type { Database } from 'bun:sqlite'

const keepFor = 7 * 24 * 60 * 60 * 1000

export const createReceipts = (db: Database) => {
  const found = db.query<{ result: string }, { session: string; request: string }>('select result from receipts where session = $session and request = $request')
  const written = db.query('insert into receipts (session, request, result, at) values ($session, $request, $result, $at)')
  const pruned = db.query('delete from receipts where at < $before')
  const cleared = db.query('delete from receipts where session = $session')

  return {
    get(session: string, request: string): SendResult | undefined {
      const row = found.get({ session, request })
      return row ? JSON.parse(row.result) : undefined
    },
    put: (session: string, request: string, result: SendResult) => void written.run({ session, request, result: JSON.stringify(result), at: Date.now() }),
    prune: () => void pruned.run({ before: Date.now() - keepFor }),
    clear: (session: string) => void cleared.run({ session }),
  }
}

export type Receipts = ReturnType<typeof createReceipts>
