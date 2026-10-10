import type { Entry } from '@sand/messages'
import type { Database } from 'bun:sqlite'
import { parseRow, type Row } from './rows'

const carriedSql = `with recursive walk(id, depth) as (
  select parent, 0 from entries where id = $before and session = $session
  union all
  select e.parent, walk.depth + 1 from walk join entries e on e.id = walk.id where e.parent is not null
)
select e.* from walk join entries e on e.id = walk.id and e.session = $session
where e.type in (select value from json_each($types))
order by walk.depth`

export const carriedReader = (db: Database) => {
  const query = db.query<Row, { session: string; before: string; types: string }>(carriedSql)
  return (session: string, before: string, types: string[]): Entry[] => {
    if (!types.length) return []
    const latest = new Map<string, Row>()
    for (const row of query.all({ session, before, types: JSON.stringify(types) })) if (!latest.has(row.type)) latest.set(row.type, row)
    return [...latest.values()].map(parseRow).reverse()
  }
}
