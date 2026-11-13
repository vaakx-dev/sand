import { botName } from '@sand/bots/contract'
import type { Need, NeedSource } from '@sand/needs-you/contract'
import type { Parts } from './parts'

const title = 'Needs a sign-in or key in its chat.'

export const botNeeds = (parts: Parts): NeedSource => ({
  id: 'bots',
  items: () =>
    parts.store.bots
      .get()
      ?.filter(bot => bot.status === 'waiting')
      .map((bot): Need => ({
        id: `bot:${bot.id}`,
        kind: 'secret',
        who: botName(bot),
        mark: () => parts.ctx.kit.botFace(bot.id, bot.color, 16),
        title,
        at: bot.last?.at ?? Date.now(),
        actions: [{ label: 'Sign in', run: () => parts.open(bot.id) }],
      })),
})
