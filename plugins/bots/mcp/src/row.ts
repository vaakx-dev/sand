import { type BotHold, botName, type BotStatus, type BotSummary, type Job, type JobStatus } from '@sand/bots/contract'

export interface JobRow {
  job: string
  title: string
  goal: string
  done: string
  status: JobStatus
  question?: string
  last?: string
}

export interface BotRow {
  bot: string
  name: string
  jobs: JobRow[]
  status: BotStatus
  hold?: BotHold
  projects: string[]
  budget: number | null
  spent: number
}

const cents = (value: number) => Math.round(value * 100) / 100

const lastOf = ({ runs: [latest] }: Job) => latest && (latest.outcome === 'nothing' ? 'Nothing to do' : latest.summary)

export const jobRowOf = (job: Job): JobRow => {
  const last = lastOf(job)
  return {
    job: job.id,
    title: job.title,
    goal: job.goal,
    done: job.done,
    status: job.status,
    ...(job.ask && { question: job.ask.question }),
    ...(last && { last }),
  }
}

export const rowOf = (bot: BotSummary): BotRow => ({
  bot: bot.id,
  name: botName(bot),
  jobs: bot.jobs.map(jobRowOf),
  status: bot.status,
  ...(bot.hold && { hold: bot.hold }),
  projects: bot.projects,
  budget: bot.budget,
  spent: cents(bot.spent),
})
