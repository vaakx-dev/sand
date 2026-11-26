import { botList } from '@sand/bots/contract'
import type { Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { createLedger } from '@sand/ledger/contract'
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { schema } from '../src/schema'

let sand: Sand | undefined
let home: string | undefined

afterEach(async () => {
  await sand?.stop()
  sand = undefined
  if (home) rmSync(home, { recursive: true, force: true })
  home = undefined
})

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const BEFORE_CHATS = 7

test("a bot's one project becomes its list of projects", () => {
  const book = createLedger(new Database(':memory:', { strict: true }))
  book.migrate('bots', schema('bots').slice(0, 4))
  const insert = book.db.query(
    `insert into bots (id, name, initial, color, job, models, computer, project, created, updated)
     values ($id, 'Bot', 'B', 'gold', '', '{"main":{},"quick":{}}', 'none', $project, 1, 1)`,
  )
  insert.run({ id: 'with', project: 'veld' })
  insert.run({ id: 'without', project: null })

  book.migrate('bots', schema('bots').slice(0, BEFORE_CHATS))

  const rows = book.db.query<{ id: string; projects: string }, []>('select id, projects from bots order by created, id').all()
  expect(rows.map(({ id, projects }) => ({ id, projects: JSON.parse(projects) }))).toEqual([
    { id: 'with', projects: ['veld'] },
    { id: 'without', projects: [] },
  ])
})

const writeOldBots = (path: string, root: string) => {
  const db = new Database(path, { create: true, strict: true })
  createLedger(db).migrate('bots', schema(root).slice(0, BEFORE_CHATS))
  const bot = db.query(
    `insert into bots (id, name, initial, color, models, computer, projects, paused, budget, created, updated)
     values ($id, $name, 'B', 'gold', $models, 'none', '[]', 0, null, 1, 1)`,
  )
  bot.run({ id: 'clerk', name: 'Clerk', models: JSON.stringify({ main: { model: 'fake/m', effort: 'high' }, quick: {} }) })
  bot.run({ id: 'quiet', name: 'Quiet', models: JSON.stringify({ main: {}, quick: {} }) })
  const entry = db.query('insert into bot_entries (id, bot, seq, at, type, data, turn) values ($id, $bot, $seq, $at, $type, $data, $turn)')
  entry.run({ id: 'ask', bot: 'clerk', seq: 1, at: 10, type: 'message', data: JSON.stringify(said('user', 'File the receipts')), turn: 't1' })
  entry.run({ id: 'answer', bot: 'clerk', seq: 2, at: 20, type: 'message', data: JSON.stringify(said('assistant', 'Filed all three.')), turn: 't1' })
  entry.run({ id: 'hello', bot: 'quiet', seq: 1, at: 30, type: 'message', data: JSON.stringify(said('user', 'Hello')), turn: null })
  db.close()
}

test("bots made before their chats were sessions keep their chat, its turns, their model and their last line", async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-bots-'))
  const root = join(home, 'bots')
  writeOldBots(join(home, 'sand.db'), root)

  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { home, plugins: ['bots/bots'] })
  const clerk = sand.sessions.require('clerk')
  const quiet = sand.sessions.require('quiet')

  expect(clerk).toMatchObject({ kind: 'bot', owner: 'bot', cwd: join(root, 'clerk'), project: null })
  expect(clerk.messages()).toEqual([said('user', 'File the receipts'), said('assistant', 'Filed all three.')])
  expect(clerk.path().slice(0, 2)).toMatchObject([
    { id: 'ask', parent: null, at: 10, turn: 't1' },
    { id: 'answer', parent: 'ask', at: 20, turn: 't1' },
  ])
  expect(clerk.latest('settings')?.data).toEqual({ model: 'fake/m', effort: 'high' })
  expect(quiet.path()).toMatchObject([{ id: 'hello', parent: null }])

  const seqs = clerk.path().map(entry => entry.seq)
  const next = clerk.append('message', said('user', 'Thanks'))
  expect(seqs).toEqual(seqs.toSorted((a, b) => a - b))
  expect(next.seq).toBeGreaterThan(Math.max(...seqs, quiet.path()[0]!.seq))
  expect((await sand.ask(botList, {})).map(bot => [bot.id, bot.last?.text])).toEqual([
    ['clerk', 'Thanks'],
    ['quiet', 'Hello'],
  ])
})
