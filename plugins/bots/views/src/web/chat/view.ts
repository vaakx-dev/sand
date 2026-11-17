import { botName, type BotSummary } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { derive, div, dynamicChild, effect, untrack } from '@vaakx-dev/vrui'
import type { Parts } from '../parts'
import { holdSlot, type HoldParts } from './hold'

export interface ChatParts extends HoldParts {
  parts: Parts
  id: string
  shown(): boolean
}

const emptyChat = (kit: Kit, bot: () => BotSummary | undefined) =>
  kit.emptyState({ text: () => (bot()?.jobs.length ? 'No messages yet.' : 'No messages yet. Say what it should take care of.') })

const composerExtras = (chat: ChatParts) => {
  const { ctx } = chat.parts
  return joinDisposers(
    ctx.composer.placeholder(() => `Message ${botName(chat.bot() ?? { name: '' })}`),
    ctx.composer.slot('above', () => ctx.shell.chipBar({ owner: chat.id })),
    holdSlot(ctx.kit, chat, ctx.composer),
  )
}

export const chatView = (chat: ChatParts) => {
  const shown = derive(chat.shown)
  effect(() => (shown.get() ? untrack(() => composerExtras(chat)) : undefined))
  const look = { empty: () => emptyChat(chat.parts.ctx.kit, chat.bot) }
  return div(
    { class: 'flex min-h-0 min-w-0 flex-1 flex-col' },
    dynamicChild(chat.parts.threadView, found => found?.render(chat.id, look) ?? null),
  )
}
