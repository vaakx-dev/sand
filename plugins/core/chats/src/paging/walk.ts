import type { Database } from 'bun:sqlite'

export interface Step {
  id: string
  parent: string | null
  size: number
  turn: number
}

const walkSql = `with recursive walk(id, depth) as (
  select $start, 0
  union all
  select e.parent, walk.depth + 1 from walk join entries e on e.id = walk.id
  where e.parent is not null and walk.depth + 1 < $limit
)
select e.id, e.parent, length(e.data) as size,
  e.type = 'message' and substr(e.data, 1, 20) like '{"role":"user"%' and instr(substr(e.data, 1, 200), '"tool_result"') = 0 as turn
from walk join entries e on e.id = walk.id and e.session = $session
order by walk.depth`

export const pathWalker = (db: Database) => {
  const query = db.query<Step, { start: string; limit: number; session: string }>(walkSql)
  return (session: string, start: string, limit: number) => query.all({ session, start, limit })
}
