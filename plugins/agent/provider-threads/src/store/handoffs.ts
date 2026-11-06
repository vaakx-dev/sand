import type { Delivery, HandoffBlock, HandoffItem } from '@sand/accounts/contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { Database } from 'bun:sqlite'
import type { HandoffStrategy } from '../contract'
import { keyOf } from './key'

export interface NewHandoff {
  conversation: ConversationRef
  turn: string
  thread: string
  generation: number
  strategy: HandoffStrategy
  first: number
  last: number
  context: string
  text: string
  items: HandoffItem[]
  omitted: string[]
}

interface Row {
  id: string
  context: string
  text: string
  items: string
}

const blockOf = (row: Row): HandoffBlock => ({ id: row.id, context: row.context, items: JSON.parse(row.items), text: row.text })

export const createHandoffStore = (db: Database) => {
  const insert = db.query(`insert into handoffs (id, owner, conversation, turn, thread, generation, strategy, first_seq, last_seq, context, text, items, omitted,
      delivery, tokens, at)
    values ($id, $owner, $conversation, $turn, $thread, $generation, $strategy, $first, $last, $context, $text, $items, $omitted, 'pending', $tokens, $at)`)
  const text = db.query<{ text: string }, { id: string }>('select text from handoffs where id = $id')
  const pending = db.query<Row, { thread: string }>("select id, context, text, items from handoffs where thread = $thread and delivery = 'pending' order by at desc limit 1")
  const delivered = db.query('update handoffs set delivery = $delivery where id = $id')
  const removed = db.query('delete from handoffs where owner = $owner and conversation = $conversation')

  return {
    create({ conversation, items, omitted, ...handoff }: NewHandoff) {
      const id = Bun.randomUUIDv7()
      insert.run({ ...handoff, ...keyOf(conversation), id, items: JSON.stringify(items), omitted: JSON.stringify(omitted), tokens: Buffer.byteLength(handoff.text), at: Date.now() })
      return id
    },
    text: (id: string) => text.get({ id })?.text,
    pending(thread: string) {
      const row = pending.get({ thread })
      return row ? blockOf(row) : undefined
    },
    deliver: (id: string, delivery: Delivery) => void delivered.run({ id, delivery }),
    remove: (conversation: ConversationRef) => void removed.run(keyOf(conversation)),
  }
}

export type HandoffStore = ReturnType<typeof createHandoffStore>
