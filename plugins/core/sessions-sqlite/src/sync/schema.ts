import type { Database } from 'bun:sqlite'

const touch = (id: string, removed: number) => `insert or replace into changes (session, removed) values (${id}, ${removed})`

export const syncLog = (db: Database) => {
  db.run('create table if not exists changes (seq integer primary key autoincrement, session text not null unique, removed integer not null default 0)')
  db.run('create table if not exists sync (id integer primary key check (id = 1), epoch text not null)')
  db.run('insert or ignore into sync (id, epoch) values (1, lower(hex(randomblob(8))))')
  db.run(`create trigger if not exists changes_entry after insert on entries begin ${touch('new.session', 0)}; end`)
  db.run(`create trigger if not exists changes_created after insert on sessions begin ${touch('new.id', 0)}; end`)
  db.run(`create trigger if not exists changes_updated after update on sessions begin ${touch('new.id', 0)}; end`)
  db.run(`create trigger if not exists changes_removed after delete on sessions begin ${touch('old.id', 1)}; end`)
}
