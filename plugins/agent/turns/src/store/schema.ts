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
]
