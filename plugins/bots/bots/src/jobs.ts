import type { Database } from 'bun:sqlite'
import type { JobVersion } from './contract'

export const createJobs = (db: Database) => {
  const insert = db.query<unknown, { bot: string; replaced: number; job: string }>('insert into bot_jobs (bot, replaced, job) values ($bot, $replaced, $job)')
  const all = db.query<JobVersion, { bot: string }>('select job, replaced from bot_jobs where bot = $bot order by replaced desc')
  const removed = db.query<unknown, { bot: string }>('delete from bot_jobs where bot = $bot')

  return {
    keep: (bot: string, job: string, replaced: number) => void insert.run({ bot, replaced, job }),
    list: (bot: string) => all.all({ bot }),
    remove: (bot: string) => void removed.run({ bot }),
  }
}
