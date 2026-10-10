import type { SessionInfo, SessionSummary } from './contract'
import type { Database } from 'bun:sqlite'

export type SummaryRow = SessionInfo & { updated: number; messages: number; named: number; pinned: number; settled: number | null; snoozed: number | null; seen: number; position: number }

export const toSummary = (row: SummaryRow): SessionSummary => ({ ...row, named: Boolean(row.named), pinned: Boolean(row.pinned) })

export const summaries = (db: Database) => {
  const query = db.query<SummaryRow, []>(
    `select s.*, coalesce(max(e.at), s.created) as updated, count(case when e.type = 'message' then 1 end) as messages
     from sessions s left join entries e on e.session = s.id
     group by s.id order by updated desc`,
  )
  return (): SessionSummary[] => query.all().map(toSummary)
}

export const remover = (db: Database) => {
  const agents = db.query<{ id: string }, { id: string }>("select id from sessions where parent = $id and kind = 'agent'")
  const entries = db.query('delete from entries where session = $id')
  const session = db.query('delete from sessions where id = $id')
  const remove = (id: string): string[] => {
    const nested = agents.all({ id }).flatMap(agent => remove(agent.id))
    entries.run({ id })
    session.run({ id })
    return [id, ...nested]
  }
  return db.transaction(remove)
}
