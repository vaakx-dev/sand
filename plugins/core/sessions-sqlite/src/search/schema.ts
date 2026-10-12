import type { Database } from 'bun:sqlite'

export const messageText = (row: string) =>
  `(select group_concat(json_extract(value, '$.text'), char(10)) from json_each(${row}.data, '$.content') where json_extract(value, '$.type') = 'text')`

const indexNew = `insert into entries_text (rowid, text, session)
  select rowid, text, session from (select new.rowid as rowid, ${messageText('new')} as text, new.session as session)
  where text is not null and new.type = 'message'`

const unindexOld = 'delete from entries_text where rowid = old.rowid'

export const searchIndex = (db: Database) => {
  const exists = db.query("select 1 from sqlite_master where name = 'entries_text'").get()
  db.run('create table if not exists search_backfill (next integer not null, last integer not null)')
  if (!exists) {
    db.run("create virtual table entries_text using fts5(text, session unindexed, tokenize = 'unicode61 remove_diacritics 2')")
    db.run('insert into search_backfill (next, last) select min(rowid), max(rowid) from entries having count(*) > 0')
  }
  db.run(`create trigger if not exists entries_text_added after insert on entries when new.type = 'message' begin ${indexNew}; end`)
  db.run(`create trigger if not exists entries_text_removed after delete on entries begin ${unindexOld}; end`)
  db.run(`create trigger if not exists entries_text_changed after update on entries begin ${unindexOld}; ${indexNew}; end`)
}
