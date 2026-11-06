import type { Database } from 'bun:sqlite'
import type { ConversationRef, SendResult } from '../contract'
import { keyOf } from './key'

const keepFor = 7 * 24 * 60 * 60 * 1000

type Key = ReturnType<typeof keyOf>

export const createReceipts = (db: Database) => {
  const found = db.query<{ result: string }, Key & { request: string }>(
    'select result from receipts where owner = $owner and conversation = $conversation and request = $request',
  )
  const written = db.query('insert into receipts (owner, conversation, request, result, at) values ($owner, $conversation, $request, $result, $at)')
  const pruned = db.query('delete from receipts where at < $before')
  const cleared = db.query('delete from receipts where owner = $owner and conversation = $conversation')

  return {
    get(conversation: ConversationRef, request: string): SendResult | undefined {
      const row = found.get({ ...keyOf(conversation), request })
      return row ? JSON.parse(row.result) : undefined
    },
    put: (conversation: ConversationRef, request: string, result: SendResult) =>
      void written.run({ ...keyOf(conversation), request, result: JSON.stringify(result), at: Date.now() }),
    prune: () => void pruned.run({ before: Date.now() - keepFor }),
    clear: (conversation: ConversationRef) => void cleared.run(keyOf(conversation)),
  }
}

export type Receipts = ReturnType<typeof createReceipts>
