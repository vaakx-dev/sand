import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger, databaseFile, olderThanData, readUpgrade } from '../src/contract'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const steps = [['create table notes (id text)'], ['alter table notes add column body text']]

const opened = () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-ledger-'))
  homes.push(home)
  const file = databaseFile(home)
  return { file, open: () => new Database(file, { create: true, strict: true }) }
}

test('the build that upgrades the database is recorded, and an older build is told it cannot read it', () => {
  const { file, open } = opened()
  const older = { id: 'aaaaaaa1', time: 1_000 }
  const newer = { id: 'bbbbbbb2', time: 2_000 }

  const first = open()
  createLedger(first, older).migrate('notes', steps.slice(0, 1))
  first.close()
  const second = open()
  createLedger(second, newer).migrate('notes', steps)
  createLedger(second, older).migrate('notes', steps)
  second.close()

  const upgrade = readUpgrade(file)
  expect(upgrade).toEqual({ build: newer.id, time: newer.time })
  expect(olderThanData(older, upgrade)).toContain('older than your data')
  expect(olderThanData(newer, upgrade)).toBeUndefined()
})

test('a build that knows fewer steps than the database leaves that data alone', () => {
  const { open } = opened()
  const db = open()
  createLedger(db, { id: 'bbbbbbb2', time: 2_000 }).migrate('notes', steps)
  expect(() => createLedger(db).migrate('notes', steps.slice(0, 1))).toThrow('from a newer sand')
  db.close()
})

test('a database no build has upgraded yet has no level', () => {
  const { file } = opened()
  expect(readUpgrade(file)).toBeUndefined()
})
