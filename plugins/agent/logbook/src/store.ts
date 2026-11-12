import type { Ledger } from '@sand/ledger/contract'
import { failure } from '@sand/orchestrator/contract'
import { uuid } from '@sand/util'
import type { Author, Entry, Removed, Revision, TagUse, Versions } from './contract'

export interface Fields {
  project: string | null
  title: string
  details: string
  links: string[]
  tags: string[]
}

export interface Search {
  query?: string
  project?: string | null
  tag?: string
  from?: number
  to?: number
  limit?: number
  offset?: number
}

interface Row {
  id: string
  at: number
  updated: number
  removed: number
  project: string | null
  author: string | null
  title: string
  details: string
  links: string
  tags: string
}

type Bindings = Record<string, string | number | null>

type Filter = [condition: string, bindings: Bindings]

const DEFAULT_LIMIT = 50

const MIGRATIONS = [
  [
    `create table logbook (
      id text primary key,
      at integer not null,
      updated integer not null,
      removed integer not null default 0,
      project text,
      author text,
      title text not null default '',
      details text not null default '',
      links text not null default '[]',
      tags text not null default '[]'
    )`,
    'create index logbook_at on logbook (removed, at)',
    `create virtual table logbook_text using fts5(title, details, tags, links, content='logbook', content_rowid='rowid', tokenize='porter unicode61')`,
    `create trigger logbook_insert after insert on logbook begin
      insert into logbook_text (rowid, title, details, tags, links) values (new.rowid, new.title, new.details, new.tags, new.links);
    end`,
    `create trigger logbook_delete after delete on logbook begin
      insert into logbook_text (logbook_text, rowid, title, details, tags, links) values ('delete', old.rowid, old.title, old.details, old.tags, old.links);
    end`,
    `create trigger logbook_update after update on logbook begin
      insert into logbook_text (logbook_text, rowid, title, details, tags, links) values ('delete', old.rowid, old.title, old.details, old.tags, old.links);
      insert into logbook_text (rowid, title, details, tags, links) values (new.rowid, new.title, new.details, new.tags, new.links);
    end`,
  ],
]

const UPSERT = `insert into logbook (id, at, updated, removed, project, author, title, details, links, tags)
  values ($id, $at, $updated, $removed, $project, $author, $title, $details, $links, $tags)
  on conflict (id) do update set at = $at, updated = $updated, removed = $removed, project = $project, author = $author,
    title = $title, details = $details, links = $links, tags = $tags`

const entryOf = (row: Row): Entry => ({
  id: row.id,
  at: row.at,
  updated: row.updated,
  project: row.project,
  author: row.author ? (JSON.parse(row.author) as Author) : null,
  title: row.title,
  details: row.details,
  links: JSON.parse(row.links) as string[],
  tags: JSON.parse(row.tags) as string[],
})

const revisionOf = (row: Row): Revision => (row.removed ? { id: row.id, updated: row.updated, removed: true } : entryOf(row))

const rowOf = (revision: Revision): Bindings => {
  if ('removed' in revision) return { id: revision.id, at: 0, updated: revision.updated, removed: 1, project: null, author: null, title: '', details: '', links: '[]', tags: '[]' }
  return {
    ...revision,
    removed: 0,
    author: revision.author && JSON.stringify(revision.author),
    links: JSON.stringify(revision.links),
    tags: JSON.stringify(revision.tags),
  }
}

const matchOf = (query: string) =>
  query
    .match(/[\p{L}\p{N}]+/gu)
    ?.map(word => `"${word}"*`)
    .join(' ')

const present = (filters: (Filter | undefined)[]) => filters.filter(filter => filter !== undefined)

const projectFilter = (project: string | null | undefined): Filter | undefined => {
  if (project === undefined) return undefined
  return project === null ? ['project is null', {}] : ['project = $project', { project }]
}

const filters = ({ query, project, tag, from, to }: Search) => {
  const match = query ? matchOf(query) : undefined
  return present([
    match ? ['rowid in (select rowid from logbook_text where logbook_text match $match)', { match }] : undefined,
    projectFilter(project),
    tag ? ['exists (select 1 from json_each(logbook.tags) where value = $tag)', { tag }] : undefined,
    from === undefined ? undefined : ['at >= $from', { from }],
    to === undefined ? undefined : ['at < $to', { to }],
  ])
}

const whereOf = (conditions: Filter[]) => ({
  sql: ['removed = 0', ...conditions.map(([condition]) => condition)].join(' and '),
  bindings: Object.assign({}, ...conditions.map(([, bindings]) => bindings)) as Bindings,
})

const nextUpdate = (before: number) => Math.max(Date.now(), before + 1)

class Store {
  constructor(private readonly ledger: Ledger) {
    ledger.migrate('logbook', MIGRATIONS)
  }

  private get db() {
    return this.ledger.db
  }

  private row(id: string) {
    return this.db.query<Row, Bindings>('select * from logbook where id = $id').get({ id }) ?? undefined
  }

  private live(id: string) {
    const found = this.row(id)
    if (!found || found.removed) throw failure('not_found', `No Logbook entry ${id}`)
    return entryOf(found)
  }

  private put<R extends Revision>(revision: R) {
    this.db.query(UPSERT).run(rowOf(revision))
    return revision
  }

  add(fields: Fields, author: Author | null): Entry {
    const at = Date.now()
    return this.put({ id: uuid(), at, updated: at, author, ...fields })
  }

  change(id: string, patch: Partial<Fields>): Entry {
    const before = this.live(id)
    return this.put({ ...before, ...patch, updated: nextUpdate(before.updated) })
  }

  remove(id: string): Removed {
    const before = this.live(id)
    return this.put({ id, updated: nextUpdate(before.updated), removed: true as const })
  }

  search(search: Search): Entry[] {
    const { sql, bindings } = whereOf(filters(search))
    const rows = this.db.query<Row, Bindings>(`select * from logbook where ${sql} order by at desc, rowid desc limit $limit offset $offset`).all({ ...bindings, limit: search.limit ?? DEFAULT_LIMIT, offset: search.offset ?? 0 })
    return rows.map(entryOf)
  }

  tags(project: string | null | undefined): TagUse[] {
    const { sql, bindings } = whereOf(present([projectFilter(project)]))
    return this.db
      .query<TagUse, Bindings>(`select value as tag, count(*) as count from logbook, json_each(logbook.tags) where ${sql} group by value order by count desc, tag`)
      .all(bindings)
  }

  versions(): Versions {
    const rows = this.db.query<{ id: string; updated: number }, Bindings>('select id, updated from logbook').all({})
    return Object.fromEntries(rows.map(({ id, updated }) => [id, updated]))
  }

  revisions(ids: string[]): Revision[] {
    return this.db.query<Row, Bindings>('select * from logbook where id in (select value from json_each($ids))').all({ ids: JSON.stringify(ids) }).map(revisionOf)
  }

  take(offered: Revision[]): string[] {
    return this.ledger.tx(() => {
      const versions = new Map(this.revisions(offered.map(revision => revision.id)).map(revision => [revision.id, revision.updated]))
      const accepted = offered.filter(revision => revision.updated > (versions.get(revision.id) ?? -1))
      for (const revision of accepted) this.put(revision)
      return accepted.map(revision => revision.id)
    })
  }
}

export { Store }
