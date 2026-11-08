import type { BotStatus, BotSummary, BotTab, BotTabSource } from '@sand/bots/contract'
import { statuses, type Status } from '@sand/ui-shell/contract'
import type { Registry } from './registry'

const own: Record<BotStatus, Status | undefined> = { idle: undefined, working: 'running', waiting: 'waiting', failed: 'waiting' }

const rank = (status: Status) => statuses.indexOf(status)

export const urgent = (status: Status | undefined) => status === 'waiting' || status === 'ready' || status === 'merging'

export const settled = (status: Status) => status === 'merged' || status === 'done'

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

  return { source, list, get, lead, status, schemes: () => sources.items.get().map(found => found.scheme) }
}

export type Work = ReturnType<typeof work>
