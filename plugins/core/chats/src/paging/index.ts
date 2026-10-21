import type { Database } from 'bun:sqlite'
import { carriedReader } from './carried'
import { pager } from './page'
import { sinceReader } from './since'

export type Paging = ReturnType<typeof createPaging>

export const createPaging = (db: Database) => {
  const parentOf = db.query<{ parent: string | null }, { id: string; session: string }>('select parent from entries where id = $id and session = $session')
  return {
    page: pager(db),
    since: sinceReader(db),
    carried: carriedReader(db),
    parent: (session: string, id: string) => parentOf.get({ id, session })?.parent ?? null,
  }
}
