const touch = (id: string) => `insert or replace into changes (session) values (${id})`

export const v1 = [
  `create table chats (
    id text primary key,
    created integer not null,
    cwd text not null,
    project text,
    head text,
    kind text not null,
    parent text,
    origin text,
    title text not null default '',
    seen integer not null default 1,
    pinned integer not null default 0,
    settled integer,
    snoozed integer,
    position real
  )`,
  'create table entries (id text primary key, session text not null, parent text, at integer not null, type text not null, data text not null, size integer)',
  'create index chats_parent on chats (parent)',
  'create index entries_session_type_at on entries (session, type, at)',
  'create table changes (seq integer primary key autoincrement, session text not null unique)',
  'create table sync (id integer primary key check (id = 1), epoch text not null)',
  'insert into sync (id, epoch) values (1, lower(hex(randomblob(8))))',
  `create trigger changes_entry after insert on entries begin ${touch('new.session')}; end`,
  `create trigger changes_chat_created after insert on chats begin ${touch('new.id')}; end`,
  `create trigger changes_chat_updated after update on chats begin ${touch('new.id')}; end`,
]
