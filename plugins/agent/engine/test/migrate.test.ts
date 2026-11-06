import { startSand } from '@sand/harness'
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { schema } from '../src/store/schema'

let home: string

afterEach(() => rmSync(home, { recursive: true, force: true }))

const threadOnlyVersion = 3

test("turns stored before conversations had owners become the threads' turns", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-engine-'))
  const db = new Database(join(home, 'sand.db'), { create: true, strict: true })
  db.run('create table schema (owner text primary key, version integer not null)')
  for (const step of schema.slice(0, threadOnlyVersion)) for (const sql of step) db.run(sql)
  db.run(`insert into schema (owner, version) values ('turns', ${threadOnlyVersion})`)
  db.run(`insert into turns (id, session, ordinal, status, source, model, speed, prompt, owner, lease, usage, started, ended, stop_reason)
    values ('t1', 'chat', 1, 'completed', 'fake', 'fake/m', 'normal', 'p1', 'runtime-1', 0, '{"input":1,"output":2,"cacheRead":0,"cacheWrite":0}', 10, 20, 'end_turn')`)
  db.run(`insert into receipts (session, request, result, at) values ('chat', 'r1', '{"disposition":"started","turn":"t1"}', ${Date.now()})`)
  db.close()

  const sand = await startSand([{ id: 'fake', models: ['m'] }], { home })
  try {
    expect(sand.turns.get('t1')).toMatchObject({ session: 'chat', ordinal: 1, status: 'completed', usage: { input: 1, output: 2 } })
    const migrated = new Database(join(home, 'sand.db'))
    expect(migrated.query('select owner, conversation, holder from turns').all()).toEqual([{ owner: 'thread', conversation: 'chat', holder: 'runtime-1' }])
    expect(migrated.query('select owner, conversation, request from receipts').all()).toEqual([{ owner: 'thread', conversation: 'chat', request: 'r1' }])
    migrated.close()
  } finally {
    await sand.stop()
  }
})
