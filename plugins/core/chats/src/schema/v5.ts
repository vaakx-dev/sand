export const v5 = [
  'create table media_backfill (id integer primary key check (id = 1), next integer not null, last integer not null)',
  'insert into media_backfill (id, next, last) select 1, 1, coalesce(max(rowid), 0) from entries',
]
