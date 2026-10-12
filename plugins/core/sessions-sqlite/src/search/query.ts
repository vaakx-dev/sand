import type { Database } from 'bun:sqlite'
import type { SessionMatch } from '../contract'
import { toSummary, type SummaryRow } from '../list'
import { columns } from '../sync/summaries'

const hitsSql = `select session, snippet(entries_text, 0, '', '', '…', 16) as match from entries_text
  where entries_text match $query order by rank limit 500`

const summariesSql = `select ${columns} from sessions s where s.kind != 'agent' and s.id in (select value from json_each($ids))`

const ftsQuery = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map(word => `"${word.replaceAll('"', '""')}"*`)
    .join(' ')

export const sessionSearch = (db: Database) => {
  const hits = db.query<{ session: string; match: string }, { query: string }>(hitsSql)
  const summaries = db.query<SummaryRow, { ids: string }>(summariesSql)
  return (text: string, limit = 20): SessionMatch[] => {
    const query = ftsQuery(text)
    if (!query) return []
    const best = new Map<string, string>()
    for (const hit of hits.all({ query })) if (!best.has(hit.session)) best.set(hit.session, hit.match)
    const found = new Map(summaries.all({ ids: JSON.stringify([...best.keys()]) }).map(row => [row.id, toSummary(row)]))
    return [...best]
      .flatMap(([id, match]) => {
        const summary = found.get(id)
        return summary ? [{ ...summary, match }] : []
      })
      .slice(0, limit)
  }
}
