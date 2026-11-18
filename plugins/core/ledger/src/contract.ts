import type { BuildInfo } from '@sand/util/release'
import { Database } from 'bun:sqlite'
import { service } from 'drydock'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { compact, type CompactFailure } from './compact'

export type { CompactFailure }

export interface Ledger {
  db: Database
  tx<T>(fn: () => T): T
  migrate(owner: string, steps: string[][]): void
  compact(): CompactFailure | undefined
}

export interface Upgrade {
  build: string
  time: number
}

export const ledger = service<Ledger>('ledger')

const DATABASE = 'sand.db'

export const BUSY_TIMEOUT_MS = 5_000

const day = (time: number) => new Date(time).toISOString().slice(0, 10)

const short = (id: string) => id.slice(0, 7)

const newerData = (owner: string, version: number, known: number) =>
  `sand.db holds ${owner} data from a newer sand (version ${version}; this build knows up to ${known}), so this build leaves it alone. Update sand to the newest build.`

export const databaseFile = (home: string) => join(home, DATABASE)

export const readUpgrade = (file: string): Upgrade | undefined => {
  if (!existsSync(file)) return undefined
  const db = new Database(file, { readonly: true })
  try {
    db.run(`pragma busy_timeout = ${BUSY_TIMEOUT_MS}`)
    return db.query<Upgrade, []>('select build, time from upgraded_by').get() ?? undefined
  } catch {
    return undefined
  } finally {
    db.close()
  }
}

export const olderThanData = (build: BuildInfo, upgrade: Upgrade | undefined) =>
  upgrade && build.time < upgrade.time
    ? `build ${short(build.id)} (${day(build.time)}) is older than your data, which build ${short(upgrade.build)} (${day(upgrade.time)}) already upgraded, so it could not read your chats and bots`
    : undefined

export const createLedger = (db: Database, build?: BuildInfo): Ledger => {
  db.run('create table if not exists schema (owner text primary key, version integer not null)')
  db.run('create table if not exists upgraded_by (id integer primary key check (id = 1), build text not null, time integer not null)')
  const versionOf = db.query<{ version: number }, { owner: string }>('select version from schema where owner = $owner')
  const record = db.query('insert or replace into schema (owner, version) values ($owner, $version)')
  const upgraded = db.query(
    'insert into upgraded_by (id, build, time) values (1, $build, $time) on conflict (id) do update set build = excluded.build, time = excluded.time where excluded.time > upgraded_by.time',
  )
  const tx = <T>(fn: () => T): T => db.transaction(fn).immediate()

  return {
    db,
    tx,
    migrate: (owner, steps) =>
      tx(() => {
        const version = versionOf.get({ owner })?.version ?? 0
        if (version > steps.length) throw new Error(newerData(owner, version, steps.length))
        if (version === steps.length) return
        for (const step of steps.slice(version)) for (const sql of step) db.run(sql)
        record.run({ owner, version: steps.length })
        if (build) upgraded.run({ build: build.id, time: build.time })
      }),
    compact: () => compact(db),
  }
}
