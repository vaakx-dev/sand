export const schema = [
  [
    `create table bots (
      id text primary key,
      name text not null,
      initial text not null,
      color text not null,
      job text not null,
      models text not null,
      computer text not null,
      created integer not null,
      updated integer not null
    )`,
    `create table bot_entries (
      id text primary key,
      bot text not null,
      seq integer not null,
      at integer not null,
      type text not null,
      data text not null,
      turn text,
      unique (bot, seq)
    )`,
  ],
  ['alter table bots add column project text'],
]
