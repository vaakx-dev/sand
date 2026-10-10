import type { Database } from 'bun:sqlite'
import type { SyncedSummaries } from '../contract'
import { toSummary, type SummaryRow } from '../list'

const columns = `s.*,
  coalesce((select max(at) from entries e where e.session = s.id), s.created) as updated,
  (select count(*) from entries e where e.session = s.id and e.type = 'message') as messages`

const changedSql = `select ${columns} from sessions s left join changes c on c.session = s.id
  where (coalesce(c.seq, 0) > $since and s.kind != 'agent') or s.id in (select value from json_each($active))
  order by updated desc`

const childrenSql = `with recursive tree(id) as (
  select id from sessions where parent = $parent and kind = 'agent'
  union select s.id from sessions s join tree on s.parent = tree.id where s.kind = 'agent'
)
select ${columns} from tree join sessions s on s.id = tree.id order by updated desc`

const parse = (token: string | null, epoch: string) => {
  const [from, seq] = (token ?? '').split('.')
  const value = Number(seq)
  return from === epoch && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

export const syncedSummaries = (db: Database) => {
  const epoch = db.query<{ epoch: string }, []>('select epoch from sync where id = 1').get()?.epoch ?? ''
  const latest = db.query<{ seq: number }, []>('select coalesce(max(seq), 0) as seq from changes')
  const changed = db.query<SummaryRow, { since: number; active: string }>(changedSql)
  const removed = db.query<{ session: string }, { since: number }>('select session from changes where seq > $since and removed = 1')
  const children = db.query<SummaryRow, { parent: string }>(childrenSql)

  return {
    synced(token: string | null, active: string[]): SyncedSummaries {
      const since = parse(token, epoch)
      const sync = `${epoch}.${latest.get()!.seq}`
      const sessions = changed.all({ since: since ?? -1, active: JSON.stringify(active) }).map(toSummary)
      if (since === undefined) return { sessions, sync, delta: false }
      return { sessions, removed: removed.all({ since }).map(row => row.session), sync, delta: true }
    },
    children: (parent: string) => children.all({ parent }).map(toSummary),
  }
}
