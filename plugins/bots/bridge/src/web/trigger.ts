import { botName, type BotSummary } from '@sand/bots/contract'
import type { Trigger, TriggerItem } from '@sand/composer/contract'
import { matching, uuid } from '@sand/util'
import { botKind } from '../contract'
import type { Roster } from './roster'

interface BotItem extends TriggerItem {
  bot: BotSummary
}

export const botTrigger = (roster: Roster): Trigger<BotItem> => ({
  char: '@',
  label: 'bots',
  items(query) {
    const bots = roster.list()
    return matching(
      bots.map(botName),
      query,
      true,
    ).map((index): BotItem => {
      const bot = bots[index]!
      return { label: botName(bot), description: bot.jobs.map(job => job.title).join(', ').slice(0, 80) || 'Bot', icon: 'bot', bot }
    })
  },
  accept: ({ bot }) => ({ v: 1, id: uuid(), kind: botKind, label: botName(bot), data: { id: bot.id } }),
})
