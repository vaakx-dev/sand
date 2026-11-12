import type { BotStatus, BotSummary } from '@sand/bots/contract'
import type { Status } from '@sand/ui-shell/contract'

const own: Record<BotStatus, Status | undefined> = { idle: undefined, working: 'running', waiting: 'waiting', failed: undefined }

export const botStatus = (bot: BotSummary) => own[bot.status]

export const statusLine = (bot: BotSummary) => {
  if (bot.status === 'working') return 'Working'
  if (bot.status === 'failed') return 'Failed'
  return (bot.last?.gist ?? bot.last?.text)?.trim() || undefined
}
