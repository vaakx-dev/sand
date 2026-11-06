export const schema = [
  [
    `create table approval_rules (
      id text primary key,
      owner text not null,
      conversation text,
      title text,
      tool text,
      effect text,
      verdict text not null,
      at integer not null
    )`,
    `create table approvals (
      id text primary key,
      owner text not null,
      conversation text not null,
      title text not null,
      turn text not null,
      call text not null,
      tool text not null,
      effect text not null,
      summary text not null,
      outcome text not null,
      by text,
      rule text,
      at integer not null,
      decided integer,
      unique (turn, call)
    )`,
    "create index approvals_waiting on approvals (at) where outcome = 'waiting'",
    'create index approvals_conversation on approvals (owner, conversation, at)',
    `create table approval_settings (
      name text primary key,
      value text not null
    )`,
  ],
]
