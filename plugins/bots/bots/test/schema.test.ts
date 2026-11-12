import { createLedger } from '@sand/ledger/contract'
import { Database } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import { changeEntry } from '../src/contract'
import { createEntries } from '../src/entries'
import { createRecords } from '../src/records'
import { schema } from '../src/schema'

test("a bot's one project becomes its list of projects", () => {
  const book = createLedger(new Database(':memory:', { strict: true }))
  book.migrate('bots', schema.slice(0, 4))
  const insert = book.db.query(
    `insert into bots (id, name, initial, color, job, models, computer, project, created, updated)
     values ($id, 'Bot', 'B', 'gold', '', '{"main":{},"quick":{}}', 'none', $project, 1, 1)`,
  )
  insert.run({ id: 'with', project: 'veld' })
  insert.run({ id: 'without', project: null })

  book.migrate('bots', schema)

  expect(createRecords(book.db).list().map(({ id, projects }) => ({ id, projects }))).toEqual([
    { id: 'with', projects: ['veld'] },
    { id: 'without', projects: [] },
  ])
})

test("an agent's old job note becomes a change in the bot's chat", () => {
  const book = createLedger(new Database(':memory:', { strict: true }))
  book.migrate('bots', schema.slice(0, 5))
  book.db
    .query("insert into bot_entries (id, bot, seq, at, type, data) values ('note', 'bot', 1, 1, 'bot-job', $data)")
    .run({ data: JSON.stringify({ job: 'You file notes.', previous: 'You keep notes.' }) })

  book.migrate('bots', schema)

  expect(createEntries(book.db).entries('bot')).toEqual([
    expect.objectContaining({ type: changeEntry, data: { by: { kind: 'agent' }, before: { job: 'You keep notes.' }, after: { job: 'You file notes.' } } }),
  ])
})
