import type { BotSummary } from '@sand/bots/contract'
import type { Trigger, TriggerItem } from '@sand/composer/contract'
import { matching, oneLine, uuid } from '@sand/util'
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
      bots.map(bot => bot.name),
      query,
      true,
    ).map((index): BotItem => {
      const bot = bots[index]!
      return { label: bot.name, description: oneLine(bot.job).slice(0, 80) || 'Bot', icon: 'bot', bot }
    })
  },
  accept: ({ bot }) => ({ v: 1, id: uuid(), kind: botKind, label: bot.name, data: { id: bot.id } }),
})
