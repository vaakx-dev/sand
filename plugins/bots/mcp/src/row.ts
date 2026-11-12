import { botName, type BotSummary } from '@sand/bots/contract'
import type { BotRow } from './contract'

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
