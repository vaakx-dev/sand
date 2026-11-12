import { type BotHold, botName, type BotStatus, type BotSummary } from '@sand/bots/contract'

export interface BotRow {
  bot: string
  name: string
  job: string
  status: BotStatus
  hold?: BotHold
  projects: string[]
  budget: number | null
  spent: number
}

const jobLength = 200

const cents = (value: number) => Math.round(value * 100) / 100

export const rowOf = (bot: BotSummary): BotRow => ({
  bot: bot.id,
  name: botName(bot),
  job: bot.job.slice(0, jobLength),
  status: bot.status,
  ...(bot.hold && { hold: bot.hold }),
  projects: bot.projects,
  budget: bot.budget,
  spent: cents(bot.spent),
})
