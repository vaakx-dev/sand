import { plural } from '@sand/util'
import type { BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'

const DAY_MS = 86_400_000

const working = (bot: BotSummary) => bot.status === 'working' || bot.subagents > 0

export const botStatus = (bot: BotSummary): Status | undefined => {
  if (bot.status === 'waiting' || bot.jobs.some(job => job.status === 'needs')) return 'waiting'
  return working(bot) ? 'running' : undefined
}

export const faceStateOf = (bot: BotSummary): FaceState | undefined => {
  const status = botStatus(bot)
  return status === 'running' || status === 'waiting' ? status : undefined
}

const lastText = (bot: BotSummary) => (bot.last?.gist ?? bot.last?.text)?.trim() || undefined

export const statusLine = (bot: BotSummary) => {
  const asking = bot.jobs.find(job => job.status === 'needs')
  if (asking) return `${asking.title} needs you`
  if (bot.status === 'working') return lastText(bot) ?? 'Working'
  if (bot.subagents) return `${plural(bot.subagents, 'subagent')} working`
  if (bot.status === 'failed') return 'Failed'
  return lastText(bot)
}

export const settled = (bot: BotSummary, days: number, now: number) => !botStatus(bot) && now - bot.talked > days * DAY_MS
