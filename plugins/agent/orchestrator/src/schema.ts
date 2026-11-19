export const schema = [
  ['create table thread_starts (request text primary key, thread text not null, at integer not null)'],
  ['create table thread_starters (thread text primary key, owner text not null, id text not null, at integer not null)'],
  ['alter table thread_starters add column subagent integer not null default 1'],
  ['alter table thread_starters add column pc text'],
  [
    'create table thread_reports (request text primary key, pc text not null, report text not null, at integer not null)',
    'create table thread_owed (thread text primary key, pc text not null, action text not null)',
  ],
]
