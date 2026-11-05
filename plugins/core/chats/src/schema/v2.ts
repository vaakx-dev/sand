const searchLeftovers = [
  'drop trigger if exists entries_text_added',
  'drop trigger if exists entries_text_removed',
  'drop trigger if exists entries_text_changed',
  'drop table if exists entries_text',
  'drop table if exists search_backfill',
]

export const v2 = [
  ...searchLeftovers,
  'drop trigger changes_entry',
  'alter table entries add column seq integer',
  'alter table entries add column turn text',
  'create index entries_session_seq on entries (session, seq)',
  "insert into sqlite_sequence (name, seq) select 'changes', 0 where not exists (select 1 from sqlite_sequence where name = 'changes')",
  "update sqlite_sequence set seq = max(seq, (select coalesce(max(rowid), 0) from entries)) where name = 'changes'",
]
