import type { Database } from 'bun:sqlite'
import { uuid } from '@sand/util'
import type { AppendMeta } from '@sand/chats/contract'
import type { BotEntry, EntryPage } from './contract'

type Row = {
  id: string
  bot: string
  seq: number
  at: number
  type: string
  data: string
  turn: string | null
}

const pageSize = 100

const toEntry = ({ data, turn, ...row }: Row): BotEntry => ({ ...row, data: JSON.parse(data), ...(turn ? { turn } : {}) })

export const createEntries = (db: Database) => {
  const last = db.query<{ seq: number }, { bot: string }>('select coalesce(max(seq), 0) as seq from bot_entries where bot = $bot')
  const insert = db.query<unknown, Row>('insert into bot_entries (id, bot, seq, at, type, data, turn) values ($id, $bot, $seq, $at, $type, $data, $turn)')
  const removed = db.query<unknown, { bot: string }>('delete from bot_entries where bot = $bot')
  const all = db.query<Row, { bot: string }>('select * from bot_entries where bot = $bot order by seq')
  const before = db.query<Row, { bot: string; seq: number; limit: number }>(
    'select * from bot_entries where bot = $bot and seq < $seq order by seq desc limit $limit',
  )
  const newest = db.query<Row, { bot: string; type: string; limit: number }>(
    'select * from bot_entries where bot = $bot and type = $type order by seq desc limit $limit',
  )

  return {
    append(bot: string, type: string, data: unknown, meta: AppendMeta = {}): BotEntry {
      const row: Row = {
        id: meta.id ?? uuid(),
        bot,
        seq: last.get({ bot })!.seq + 1,
        at: meta.at ?? Date.now(),
        type,
        data: JSON.stringify(data),
        turn: meta.turn ?? null,
      }
      insert.run(row)
      return toEntry(row)
    },
    entries: (bot: string) => all.all({ bot }).map(toEntry),
    page(bot: string, seq = Number.MAX_SAFE_INTEGER, limit = pageSize): EntryPage {
      const rows = before.all({ bot, seq, limit: limit + 1 })
      return { entries: rows.slice(0, limit).reverse().map(toEntry), more: rows.length > limit }
    },
    remove: (bot: string) => void removed.run({ bot }),
    newest: (bot: string, type: string, limit: number) => newest.all({ bot, type, limit }).map(toEntry),
  }
}

export type Entries = ReturnType<typeof createEntries>
