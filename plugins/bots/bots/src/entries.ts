import type { Database } from 'bun:sqlite'
import { uuid } from '@sand/util'
import type { UsageRecord } from '@sand/accounts/contract'
import type { AppendMeta } from '@sand/chats/contract'
import { type BotEntry, type EntryPage, type EntryRange, runEntry } from './contract'

type Row = {
  id: string
  bot: string
  seq: number
  at: number
  type: string
  data: string
  turn: string | null
}

const pageSize = 60
const pageBytes = 160_000

const toEntry = ({ data, turn, ...row }: Row): BotEntry => ({ ...row, data: JSON.parse(data), ...(turn ? { turn } : {}) })

const withinBytes = (newestFirst: Row[]) => {
  let bytes = 0
  const over = newestFirst.findIndex((row, index) => (bytes += row.data.length) > pageBytes && index > 0)
  return over < 0 ? newestFirst : newestFirst.slice(0, over)
}

export const createEntries = (db: Database) => {
  const last = db.query<{ seq: number }, { bot: string }>('select coalesce(max(seq), 0) as seq from bot_entries where bot = $bot')
  const insert = db.query<unknown, Row>('insert into bot_entries (id, bot, seq, at, type, data, turn) values ($id, $bot, $seq, $at, $type, $data, $turn)')
  const removed = db.query<unknown, { bot: string }>('delete from bot_entries where bot = $bot')
  const all = db.query<Row, { bot: string }>('select * from bot_entries where bot = $bot order by seq')
  const between = db.query<Row, { bot: string; before: number; after: number; limit: number }>(
    'select * from bot_entries where bot = $bot and seq < $before and seq > $after order by seq desc limit $limit',
  )
  const byId = db.query<Row, { bot: string; id: string }>('select * from bot_entries where bot = $bot and id = $id')
  const newest = db.query<Row, { bot: string; type: string; limit: number }>(
    'select * from bot_entries where bot = $bot and type = $type order by seq desc limit $limit',
  )
  const runs = db.query<Row, { bot: string; job: string; limit: number }>(
    `select * from bot_entries where bot = $bot and type = '${runEntry}' and data ->> '$.job' = $job order by seq desc limit $limit`,
  )
  const since = db.query<{ data: string }, { bot: string; type: string; at: number }>(
    'select data from bot_entries where bot = $bot and type = $type and at >= $at',
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
    page(bot: string, { before = Number.MAX_SAFE_INTEGER, after = 0, limit = pageSize }: EntryRange = {}): EntryPage {
      const rows = between.all({ bot, before, after, limit: limit + 1 })
      const kept = withinBytes(rows.slice(0, limit))
      return { entries: kept.reverse().map(toEntry), more: rows.length > kept.length }
    },
    entry(bot: string, id: string) {
      const row = byId.get({ bot, id })
      return row ? toEntry(row) : undefined
    },
    remove: (bot: string) => void removed.run({ bot }),
    newest: (bot: string, type: string, limit: number) => newest.all({ bot, type, limit }).map(toEntry),
    runs: (bot: string, job: string, limit: number) => runs.all({ bot, job, limit }).map(toEntry),
    usage: (bot: string, at: number): UsageRecord[] => since.all({ bot, type: 'usage', at }).map(row => JSON.parse(row.data)),
  }
}

export type Entries = ReturnType<typeof createEntries>
