export const schema = [
  [
    `create table permission_rules (
      id text primary key,
      owner text not null,
      conversation text not null,
      title text not null,
      tool text not null,
      verdict text not null,
      at integer not null
    )`,
    `create table permission_decisions (
      id text primary key,
      owner text not null,
      conversation text not null,
      title text not null,
      turn text not null,
      call text not null,
      tool text not null,
      effect text not null,
      uses text,
      summary text not null,
      key text not null,
      mode text not null,
      once integer not null,
      outcome text not null,
      by text,
      reason text,
      rule text,
      blocked text not null,
      late text,
      at integer not null,
      deadline integer,
      decided integer
    )`,
    "create index permission_decisions_open on permission_decisions (at) where outcome in ('waiting', 'expired')",
    'create index permission_decisions_conversation on permission_decisions (owner, conversation, at)',
    `create table permission_modes (
      owner text not null,
      conversation text not null,
      mode text not null,
      at integer not null,
      primary key (owner, conversation)
    )`,
    `create table permission_settings (
      name text primary key,
      value text not null
    )`,
  ],
]
