import type { Database } from 'bun:sqlite'
import { uuid } from '@sand/util'
import { type BotEntry, type Job, type JobRun, type Jobs, type NewJob, runEntry, type RunEntry } from './contract'
import type { Entries } from './entries'

type Row = {
  id: string
  bot: string
  title: string
  goal: string
  done: string
  paused: number
  created: number
  updated: number
}

type Record = Omit<Job, 'status' | 'ask' | 'runs'>

export interface JobHooks {
  known(bot: string): string
  append(bot: string, type: string, data: unknown): BotEntry
  changed(bot: string): void
  removed(job: Job): void
}

const RECENT_RUNS = 8

const toRecord = (row: Row): Record => ({ ...row, paused: row.paused === 1 })

const toRow = (record: Record): Row => ({ ...record, paused: Number(record.paused) })

const runOf = ({ id, at, data }: BotEntry): JobRun => {
  const { outcome, summary } = data as RunEntry
  return { entry: id, at, outcome, summary }
}

const askOf = (latest: BotEntry | undefined) => {
  const run = latest?.data as RunEntry | undefined
  return run?.outcome === 'needs' && run.question ? { question: run.question, entry: latest!.id } : undefined
}

const jobOf = (record: Record, runs: BotEntry[]): Job => {
  const ask = askOf(runs[0])
  const status = record.paused ? 'paused' : ask ? 'needs' : 'on'
  return { ...record, status, ...(ask && { ask }), runs: runs.map(runOf) }
}

export const createJobs = (db: Database, entries: Entries, hooks: JobHooks) => {
  const ofBot = db.query<Row, { bot: string }>('select * from bot_jobs where bot = $bot order by created')
  const one = db.query<Row, { id: string }>('select * from bot_jobs where id = $id')
  const save = db.query<unknown, Row>(
    `insert or replace into bot_jobs (id, bot, title, goal, done, paused, created, updated)
     values ($id, $bot, $title, $goal, $done, $paused, $created, $updated)`,
  )
  const removeOne = db.query<unknown, { id: string }>('delete from bot_jobs where id = $id')
  const removeAll = db.query<unknown, { bot: string }>('delete from bot_jobs where bot = $bot')

  const assembled = (record: Record) => jobOf(record, entries.runs(record.bot, record.id, RECENT_RUNS))

  const record = (id: string) => {
    const row = one.get({ id })
    if (!row) throw new Error(`No job ${id}`)
    return toRecord(row)
  }

  const stored = (next: Record) => {
    save.run(toRow(next))
    hooks.changed(next.bot)
    return assembled(next)
  }

  const service: Jobs = {
    get(id) {
      const row = one.get({ id })
      return row ? assembled(toRecord(row)) : undefined
    },
    create(bot, spec: Omit<NewJob, 'bot'>) {
      const now = Date.now()
      return stored({ id: uuid(), bot: hooks.known(bot), ...spec, paused: false, created: now, updated: now })
    },
    update: (id, patch) => stored({ ...record(id), ...patch, updated: Date.now() }),
    remove(id) {
      const found = service.get(id)
      if (!found) return false
      removeOne.run({ id })
      hooks.changed(found.bot)
      hooks.removed(found)
      return true
    },
    report(id, { outcome, summary = '', question }) {
      const { bot, title } = record(id)
      hooks.append(bot, runEntry, { job: id, title, outcome, summary, ...(question && { question }) } satisfies RunEntry)
      return service.get(id)!
    },
  }

  return {
    service,
    list: (bot: string) => ofBot.all({ bot }).map(row => assembled(toRecord(row))),
    forget: (bot: string) => void removeAll.run({ bot }),
  }
}
