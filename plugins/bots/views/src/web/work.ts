import { plural } from '@sand/util'
import type { BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'

const working = (bot: BotSummary) => bot.status === 'working' || bot.subagents.length > 0

export const subagentsSince = (bot: BotSummary) => (bot.subagents.length ? Math.min(...bot.subagents) : undefined)

export const activeAt = (bot: BotSummary) => Math.max(bot.last?.at ?? 0, bot.talked, bot.updated, ...bot.subagents)

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
  if (bot.subagents.length) return `${plural(bot.subagents.length, 'subagent')} working`
  if (bot.status === 'failed') return 'Failed'
  return lastText(bot)
}
