import type { Database } from 'bun:sqlite'
import type { Bot, BotColor, Computer } from './contract'

type Row = {
  id: string
  name: string
  initial: string
  color: string
  computer: string
  projects: string
  paused: number
  budget: number | null
  folder_id: string | null
  created: number
  updated: number
}

const toBot = ({ folder_id, ...row }: Row): Bot => ({
  ...row,
  folderId: folder_id,
  color: row.color as BotColor,
  computer: row.computer as Computer,
  projects: JSON.parse(row.projects),
  paused: row.paused === 1,
})

const toRow = ({ folderId, ...bot }: Bot): Row => ({ ...bot, folder_id: folderId, projects: JSON.stringify(bot.projects), paused: Number(bot.paused) })

export const createRecords = (db: Database) => {
  const all = db.query<Row, []>('select * from bots order by created')
  const one = db.query<Row, { id: string }>('select * from bots where id = $id')
  const save = db.query<unknown, Row>(
    `insert into bots (id, name, initial, color, computer, projects, paused, budget, folder_id, created, updated)
     values ($id, $name, $initial, $color, $computer, $projects, $paused, $budget, $folder_id, $created, $updated)
     on conflict (id) do update set name = excluded.name, initial = excluded.initial, color = excluded.color, computer = excluded.computer,
       projects = excluded.projects, paused = excluded.paused, budget = excluded.budget, folder_id = excluded.folder_id, updated = excluded.updated`,
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
