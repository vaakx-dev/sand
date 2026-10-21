import type { Database } from 'bun:sqlite'
import type { SessionSummary, SyncedSummaries } from './contract'
import { chatsOf, summaryColumns, type ChatRow } from './rows'

const changedSql = `select ${summaryColumns} from chats c left join changes ch on ch.session = c.id
  where coalesce(ch.seq, 0) > $since or c.id in (select value from json_each($active))
  order by updated desc`

const parse = (token: string | null, epoch: string) => {
  const [from, seq] = (token ?? '').split('.')
  const value = Number(seq)
  return from === epoch && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

export const summaries = (db: Database) => {
  const all = db.query<ChatRow<SessionSummary>, []>(`select ${summaryColumns} from chats c order by updated desc`)
  return () => chatsOf(all.all())
}

export const childSummaries = (db: Database) => {
  const of = db.query<ChatRow<SessionSummary>, { parent: string }>(`select ${summaryColumns} from chats c where c.parent = $parent order by c.created`)
  return (parent: string) => chatsOf(of.all({ parent }))
}

export const syncedSummaries = (db: Database) => {
  const epochOf = db.query<{ epoch: string }, []>('select epoch from sync where id = 1')
  const latest = db.query<{ seq: number }, []>('select coalesce(max(seq), 0) as seq from changes')
  const changed = db.query<ChatRow<SessionSummary>, { since: number; active: string }>(changedSql)

  return (token: string | null, active: string[]): SyncedSummaries => {
    const epoch = epochOf.get()?.epoch ?? ''
    const since = parse(token, epoch)
    const sync = `${epoch}.${latest.get()!.seq}`
    const sessions = chatsOf(changed.all({ since: since ?? -1, active: JSON.stringify(active) }))
    return { sessions, sync, delta: since !== undefined }
  }
}
