import type { Database } from 'bun:sqlite'
import type { Bot, BotColor, Computer } from './contract'

type Row = {
  id: string
  name: string
  initial: string
  color: string
  models: string
  computer: string
  projects: string
  paused: number
  budget: number | null
  created: number
  updated: number
}

const toBot = (row: Row): Bot => ({
  ...row,
  color: row.color as BotColor,
  computer: row.computer as Computer,
  models: JSON.parse(row.models),
  projects: JSON.parse(row.projects),
  paused: row.paused === 1,
})

const toRow = (bot: Bot): Row => ({ ...bot, models: JSON.stringify(bot.models), projects: JSON.stringify(bot.projects), paused: Number(bot.paused) })

export const createRecords = (db: Database) => {
  const all = db.query<Row, []>('select * from bots order by created')
  const one = db.query<Row, { id: string }>('select * from bots where id = $id')
  const save = db.query<unknown, Row>(
    `insert or replace into bots (id, name, initial, color, models, computer, projects, paused, budget, created, updated)
     values ($id, $name, $initial, $color, $models, $computer, $projects, $paused, $budget, $created, $updated)`,
  )
  const remove = db.query<unknown, { id: string }>('delete from bots where id = $id')

  return {
    list: () => all.all().map(toBot),
    get: (id: string) => {
      const row = one.get({ id })
      return row ? toBot(row) : undefined
    },
    save: (bot: Bot) => void save.run(toRow(bot)),
    remove: (id: string) => remove.run({ id }).changes > 0,
  }
}

export type Records = ReturnType<typeof createRecords>
