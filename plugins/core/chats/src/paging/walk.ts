import type { Database } from 'bun:sqlite'
import { sizeFiller, type Unsized } from './size'

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
select e.id, e.parent, e.size,
  e.type = 'message' and substr(e.data, 1, 20) like '{"role":"user"%' and instr(substr(e.data, 1, 200), '"tool_result"') = 0 as turn
from walk join entries e on e.id = walk.id and e.session = $session
order by walk.depth`

type Walked = Omit<Step, 'size'> & { size: number | null }

export const pathWalker = (db: Database) => {
  const query = db.query<Walked, { start: string; limit: number; session: string }>(walkSql)
  const unsized = db.query<Unsized, { ids: string }>('select id, data from entries where size is null and id in (select value from json_each($ids))')
  const fill = sizeFiller(db)

  const sized = (steps: Walked[]): Step[] => {
    const missing = steps.filter(step => step.size === null).map(step => step.id)
    if (!missing.length) return steps as Step[]
    const sizes = fill(unsized.all({ ids: JSON.stringify(missing) }))
    return steps.map(step => ({ ...step, size: step.size ?? sizes.get(step.id) ?? 0 }))
  }

  return (session: string, start: string, limit: number) => sized(query.all({ session, start, limit }))
}
