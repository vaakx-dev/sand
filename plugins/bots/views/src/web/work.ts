import type { BotStatus, BotSummary, BotTab, BotTabSource } from '@sand/bots/contract'
import { statuses, type Status } from '@sand/ui-shell/contract'
import type { Registry } from './registry'

const own: Record<BotStatus, Status | undefined> = { idle: undefined, working: 'running', waiting: 'waiting', failed: 'waiting' }

const rank = (status: Status) => statuses.indexOf(status)

export const settled = (status: Status) => status === 'merged' || status === 'done'

export const runningCount = (tabs: BotTab[]) => tabs.filter(tab => tab.status === 'running' || tab.status === 'merging').length

const statusLineOf = (list: (bot: string) => BotTab[], leadOf: (bot: string) => BotTab | undefined, bot: BotSummary) => {
  const lead = leadOf(bot.id)
  const running = runningCount(list(bot.id))
  if (lead?.status === 'waiting') return { text: 'Waiting on you', waiting: true }
  if (running > 1) return { text: `Running ${running} parts`, waiting: false }
  if (lead?.status === 'running' || lead?.status === 'merging' || bot.status === 'working') {
    const step = lead?.note?.trim()
    return { text: step || 'Working', waiting: false }
  }
  if (bot.status === 'waiting' || bot.status === 'failed') return { text: 'Waiting on you', waiting: true }
  const last = (bot.last?.gist ?? bot.last?.text)?.trim()
  if (last) return { text: last, waiting: false }
  if (lead?.note?.trim()) return { text: lead.note.trim(), waiting: false }
  return undefined
}

export const work = (sources: Registry<BotTabSource & { order?: number }>) => {
  const source = (ref: string) => sources.items.get().find(found => ref.startsWith(`${found.scheme}:`))
  const list = (bot: string) => sources.items.get().flatMap(found => found.list(bot))
  const get = (ref: string): BotTab | undefined => source(ref)?.get(ref)

  const lead = (bot: string) => {
    const open = list(bot).filter(tab => !settled(tab.status))
    return open.reduce<BotTab | undefined>((best, tab) => (best && rank(best.status) <= rank(tab.status) ? best : tab), undefined)
  }

  const status = (bot: BotSummary): Status | undefined => {
    const mine = own[bot.status]
    const theirs = lead(bot.id)?.status
    if (!mine) return theirs
    return theirs && rank(theirs) < rank(mine) ? theirs : mine
  }

  const detailOf = (bot: BotSummary) => statusLineOf(list, lead, bot)

  return { source, list, get, lead, status, detailOf, schemes: () => sources.items.get().map(found => found.scheme) }
}

export type Work = ReturnType<typeof work>
