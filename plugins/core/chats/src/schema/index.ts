import type { Ledger } from '../contract'
import { v1 } from './v1'
import { v2 } from './v2'

const exists = (ledger: Ledger, sql: string) => ledger.db.query(sql).get() !== null

const adoptUnversioned = (ledger: Ledger) => {
  if (exists(ledger, "select 1 from schema where owner = 'chats'") || !exists(ledger, "select 1 from sqlite_master where type = 'table' and name = 'chats'")) return
  if (!exists(ledger, "select 1 from pragma_table_info('entries') where name = 'size'")) ledger.db.run('alter table entries add column size integer')
  ledger.db.run("insert into schema (owner, version) values ('chats', 1)")
}

export const migrateChats = (ledger: Ledger) =>
  ledger.tx(() => {
    adoptUnversioned(ledger)
    ledger.migrate('chats', [v1, v2])
  })
