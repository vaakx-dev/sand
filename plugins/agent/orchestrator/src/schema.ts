export const schema = [
  ['create table thread_starts (request text primary key, thread text not null, at integer not null)'],
  ['create table thread_starters (thread text primary key, owner text not null, id text not null, at integer not null)'],
]
