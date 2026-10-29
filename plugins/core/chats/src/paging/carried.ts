import type { Entry } from '../contract'
import type { Database } from 'bun:sqlite'
import { parseRow, type Row } from './rows'

const ancestors = (seed: string) => `with recursive walk(id, depth) as (
  ${seed}
  union all
  select e.parent, walk.depth + 1 from walk join entries e on e.id = walk.id where e.parent is not null
)
select e.* from walk join entries e on e.id = walk.id and e.session = $session`

const carriedSql = `${ancestors('select parent, 0 from entries where id = $before and session = $session')}
where e.type in (select value from json_each($types))
order by walk.depth`

const latestSql = `${ancestors('select $head, 0')}
where e.type = $type
order by walk.depth
limit 1`

export const carriedReader = (db: Database) => {
  const query = db.query<Row, { session: string; before: string; types: string }>(carriedSql)
  return (session: string, before: string, types: string[]): Entry[] => {
    if (!types.length) return []
    const latest = new Map<string, Row>()
    for (const row of query.all({ session, before, types: JSON.stringify(types) })) if (!latest.has(row.type)) latest.set(row.type, row)
    return [...latest.values()].map(parseRow).reverse()
  }
}

export const latestReader = (db: Database) => {
  const query = db.query<Row, { session: string; head: string; type: string }>(latestSql)
  return (session: string, head: string, type: string): Entry | undefined => {
    const row = query.get({ session, head, type })
    return row ? parseRow(row) : undefined
  }
}
