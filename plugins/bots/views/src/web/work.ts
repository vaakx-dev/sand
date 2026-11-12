import type { BotStatus, BotSummary } from '@sand/bots/contract'
import type { Status } from '@sand/ui-shell/contract'

const own: Record<BotStatus, Status | undefined> = { idle: undefined, working: 'running', waiting: 'waiting', failed: 'waiting' }

export const botStatus = (bot: BotSummary) => own[bot.status]

export const statusLine = (bot: BotSummary) => {
  if (bot.status === 'working') return { text: 'Working', waiting: false }
  if (bot.status === 'waiting' || bot.status === 'failed') return { text: 'Waiting on you', waiting: true }
  const last = (bot.last?.gist ?? bot.last?.text)?.trim()
  return last ? { text: last, waiting: false } : undefined
}
