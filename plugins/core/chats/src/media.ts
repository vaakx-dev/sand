import type { Database } from 'bun:sqlite'

const usedSql = `select distinct node.value as hash
from entries, json_tree(entries.data) as node
where entries.data like '%"hash":%'
  and node.key = 'hash'
  and json_extract(entries.data, node.path || '.type') in ('image', 'document')`

export const usedMedia = (db: Database) => {
  const query = db.query<{ hash: string }, []>(usedSql)
  return () => query.all().map(row => row.hash)
}
