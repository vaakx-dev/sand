import { botName } from '@sand/bots/contract'
import type { Need, NeedSource } from '@sand/needs-you/contract'
import { div } from '@vaakx-dev/vrui'
import type { Parts } from './parts'

export const botNeeds = (parts: Parts): NeedSource => ({
  id: 'bots',
  items: (): Need[] =>
    (parts.store.bots.get() ?? [])
      .filter(bot => bot.status === 'waiting')
      .map(bot => {
        const open = () => parts.open(bot.id)
        const title = 'Waiting for a sign-in or key in its chat'
        return {
          id: `bot:${bot.id}`,
          kind: 'secret',
          who: botName(bot),
          title,
          at: bot.last?.at ?? Date.now(),
          owner: bot.id,
          open,
          render: () =>
            div(
              { class: 'flex flex-col gap-2' },
              div({ class: 'text-sm text-neutral-200' }, title),
              div({ class: 'flex justify-end' }, parts.ctx.kit.quietButton({ size: 'sm', onClick: open }, 'Open chat')),
            ),
        }
      }),
})
