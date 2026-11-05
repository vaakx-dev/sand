export const schema = [
  [
    `create table turns (
      id text primary key,
      session text not null,
      ordinal integer not null,
      status text not null,
      source text not null,
      model text not null,
      effort text,
      speed text not null,
      prompt text not null,
      owner text not null,
      lease integer not null,
      cancel integer not null default 0,
      step integer not null default 0,
      usage text not null,
      partial text,
      stop_reason text,
      error text,
      detail text,
      started integer not null,
      ended integer,
      unique (session, ordinal)
    )`,
    'create index turns_open on turns (session, lease) where ended is null',
  ],
  [
    "alter table turns add column origin text not null default 'user'",
    'alter table turns add column waiting text',
    `create table pending (
      id text primary key,
      session text not null,
      kind text not null,
      prompt text not null,
      label text not null,
      origin text not null,
      held integer not null default 0,
      at integer not null
    )`,
    'create index pending_session on pending (session, at)',
    `create table receipts (
      session text not null,
      request text not null,
      result text not null,
      at integer not null,
      primary key (session, request)
    )`,
  ],
  ['alter table turns add column provider_thread text'],
]
