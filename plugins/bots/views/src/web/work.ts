import { plural } from '@sand/util'
import type { BotSummary } from '@sand/bots/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'

const replyStart = (bot: BotSummary) => (bot.status === 'working' && bot.last ? [bot.last.at] : [])

const starts = (bot: BotSummary) => [...replyStart(bot), ...bot.subagents, ...bot.background]

const working = (bot: BotSummary) => bot.status === 'working' || bot.subagents.length > 0 || bot.background.length > 0

export const workingSince = (bot: BotSummary) => {
  const found = starts(bot)
  return found.length ? Math.min(...found) : undefined
}

export const botStatus = (bot: BotSummary): Status | undefined => {
  if (bot.status === 'waiting' || bot.jobs.some(job => job.status === 'needs')) return 'waiting'
  return working(bot) ? 'running' : undefined
}

export const faceStateOf = (bot: BotSummary): FaceState | undefined => {
  const status = botStatus(bot)
  return status === 'running' || status === 'waiting' ? status : undefined
}

const lastText = (bot: BotSummary) => (bot.last?.gist ?? bot.last?.text)?.trim() || undefined

const helpersText = (bot: BotSummary) => {
  const counts = [
    ...(bot.subagents.length ? [plural(bot.subagents.length, 'subagent')] : []),
    ...(bot.background.length ? [plural(bot.background.length, 'job')] : []),
  ]
  if (counts.length === 1) return `${counts[0]} working`
  return counts.length ? counts.join(' · ') : undefined
}

export const statusLine = (bot: BotSummary) => {
  const asking = bot.jobs.find(job => job.status === 'needs')
  if (asking) return `${asking.title} needs you`
  const helpers = helpersText(bot)
  if (helpers) return helpers
  if (bot.status === 'working') return 'Working'
  if (bot.status === 'failed') return 'Failed'
  return lastText(bot)
}
