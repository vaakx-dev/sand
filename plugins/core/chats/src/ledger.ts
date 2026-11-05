import type { Database } from 'bun:sqlite'
import type { Ledger } from './contract'

export const createLedger = (db: Database): Ledger => {
  db.run('create table if not exists schema (owner text primary key, version integer not null)')
  const versionOf = db.query<{ version: number }, { owner: string }>('select version from schema where owner = $owner')
  const record = db.query('insert or replace into schema (owner, version) values ($owner, $version)')
  const tx = <T>(fn: () => T): T => db.transaction(fn).immediate()

  return {
    db,
    tx,
    migrate: (owner, steps) =>
      tx(() => {
        const version = versionOf.get({ owner })?.version ?? 0
        if (version >= steps.length) return
        for (const step of steps.slice(version)) for (const sql of step) db.run(sql)
        record.run({ owner, version: steps.length })
      }),
  }
}
