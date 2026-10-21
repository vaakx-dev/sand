import type { Database } from 'bun:sqlite'

const touch = (id: string) => `insert or replace into changes (session) values (${id})`

export const syncLog = (db: Database) => {
  db.run('create table if not exists changes (seq integer primary key autoincrement, session text not null unique)')
  db.run('create table if not exists sync (id integer primary key check (id = 1), epoch text not null)')
  db.run('insert or ignore into sync (id, epoch) values (1, lower(hex(randomblob(8))))')
  db.run(`create trigger if not exists changes_entry after insert on entries begin ${touch('new.session')}; end`)
  db.run(`create trigger if not exists changes_chat_created after insert on chats begin ${touch('new.id')}; end`)
  db.run(`create trigger if not exists changes_chat_updated after update on chats begin ${touch('new.id')}; end`)
}

export const newEpoch = (db: Database) => db.run('update sync set epoch = lower(hex(randomblob(8))) where id = 1')
