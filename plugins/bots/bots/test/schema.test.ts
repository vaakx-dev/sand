import { createLedger } from '@sand/ledger/contract'
import { Database } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import { createRecords } from '../src/records'
import { schema } from '../src/schema'

test("a bot's one project becomes its list of projects", () => {
  const book = createLedger(new Database(':memory:', { strict: true }))
  book.migrate('bots', schema.slice(0, -1))
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
