export const schema = [
  [
    `create table provider_threads (
      id text primary key,
      session text not null,
      source text not null,
      model text not null,
      generation integer not null,
      native text,
      status text not null,
      system text not null,
      seen text not null,
      effort text,
      speed text not null,
      context integer not null default 0,
      used integer not null,
      created integer not null
    )`,
    "create unique index provider_threads_open on provider_threads (session, source, model) where status != 'retired'",
  ],
  [
    `create table handoffs (
      id text primary key,
      session text not null,
      turn text not null,
      thread text not null,
      generation integer not null,
      strategy text not null,
      first_seq integer not null,
      last_seq integer not null,
      context text not null,
      text text not null,
      items text not null,
      omitted text not null,
      delivery text not null,
      tokens integer not null,
      at integer not null
    )`,
    'create index handoffs_thread on handoffs (thread, delivery)',
    'create index handoffs_session on handoffs (session)',
  ],
  [
    'drop index provider_threads_open',
    'alter table provider_threads rename column session to conversation',
    "alter table provider_threads add column owner text not null default 'thread'",
    "create unique index provider_threads_open on provider_threads (owner, conversation, source, model) where status != 'retired'",
    'drop index handoffs_session',
    'alter table handoffs rename column session to conversation',
    "alter table handoffs add column owner text not null default 'thread'",
    'create index handoffs_conversation on handoffs (owner, conversation)',
  ],
  [
    'drop index provider_threads_open',
    `update provider_threads set status = 'retired'
      where status != 'retired' and exists (select 1 from provider_threads newer
        where newer.owner = provider_threads.owner and newer.conversation = provider_threads.conversation and newer.model = provider_threads.model
          and newer.status != 'retired' and (newer.used, newer.id) > (provider_threads.used, provider_threads.id))`,
    "create unique index provider_threads_open on provider_threads (owner, conversation, model) where status != 'retired'",
  ],
]
