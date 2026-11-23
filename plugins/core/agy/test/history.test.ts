import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { agyHistory } from '../src/history'

type Part = number[]

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

function varint(value: number): Part {
  const bytes: Part = []
  let rest = value
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80)
    rest = Math.floor(rest / 0x80)
  }
  return [...bytes, rest]
}

function number(field: number, value: number): Part {
  return [...varint(field * 8), ...varint(value)]
}

function bytes(field: number, content: Part): Part {
  return [...varint(field * 8 + 2), ...varint(content.length), ...content]
}

function text(field: number, value: string): Part {
  return bytes(field, [...new TextEncoder().encode(value)])
}

function time(field: number, seconds: number): Part {
  return bytes(field, [...number(1, seconds), ...number(2, 500_000_000)])
}

function request(model: string, lastStep: number, counts: Part): Uint8Array {
  const attribute = bytes(20, [...text(1, 'last_step_index'), ...text(2, String(lastStep))])
  return new Uint8Array(bytes(1, [...bytes(4, counts), ...text(19, model), ...attribute]))
}

function step(startedAt: number): Uint8Array {
  return new Uint8Array(time(1, startedAt))
}

function createConversation(folder: string, id: string, workspace: string) {
  const conversations = join(folder, 'antigravity-cli', 'conversations')
  mkdirSync(conversations, { recursive: true })
  const database = new Database(join(conversations, `${id}.db`))
  database.run('create table gen_metadata (idx integer primary key, data blob)')
  database.run('create table steps (idx integer primary key, metadata blob)')
  database.run('create table trajectory_metadata_blob (id text primary key, data blob)')
  database.query('insert into trajectory_metadata_blob values (?, ?)').run('main', new Uint8Array(text(7, pathToFileURL(workspace).href)))
  return database
}

function addRequest(database: Database, index: number, startedAt: number, counts: Part) {
  const lastStep = index * 3
  database.query('insert into steps values (?, ?)').run(lastStep + 1, step(startedAt))
  database.query('insert into gen_metadata values (?, ?)').run(index, request('gemini-4-neon', lastStep, counts))
}

test('reads one turn per model request with uncached input, cache reads, start time and workspace', async () => {
  const home = mkdtempSync(join(tmpdir(), 'agy-history-'))
  homes.push(home)
  const workspace = join(home, 'project')
  const database = createConversation(home, 'abc-123', workspace)
  addRequest(database, 0, 1_700_000_000, [...number(2, 23_832), ...number(3, 2_492)])
  addRequest(database, 1, 1_700_000_100, [...number(2, 3_977), ...number(3, 2_327), ...number(5, 23_833)])
  database.close()
  const history = agyHistory(home)

  const turns = await history(0)

  expect(turns).toEqual([
    { session: 'abc-123', at: 1_700_000_000_500, model: 'gemini-4-neon', cwd: workspace, usage: { input: 23_832, output: 2_492, cacheRead: 0, cacheWrite: 0 } },
    { session: 'abc-123', at: 1_700_000_100_500, model: 'gemini-4-neon', cwd: workspace, usage: { input: 3_977, output: 2_327, cacheRead: 23_833, cacheWrite: 0 } },
  ])
  expect(await history(1_700_000_050_000)).toEqual([turns[1]!])

  const reopened = new Database(join(home, 'antigravity-cli', 'conversations', 'abc-123.db'))
  addRequest(reopened, 2, 1_700_000_200, [...number(2, 10), ...number(3, 20)])
  reopened.close()
  expect((await history(0)).map(turn => turn.at)).toEqual([1_700_000_000_500, 1_700_000_100_500, 1_700_000_200_500])
})
