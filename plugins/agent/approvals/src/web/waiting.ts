import { botViews } from '@sand/bots/contract'
import type { ChipSource } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'
import type { Model } from './model'

export const botWaiting = (ctx: Context, model: Model): ChipSource => ({
  key: 'waiting',
  label: 'Waiting',
  title: 'Waiting for you',
  order: 10,
  status: 'waiting',
  items: scope =>
    scope.kind === 'owner'
      ? model.all
          .get()
          .filter(({ decision }) => decision.owner === 'bot' && decision.conversation === scope.owner)
          .map(({ decision }) => ({
            id: decision.id,
            label: `Allow ${decision.tool}?`,
            status: 'waiting',
            open: () => ctx.get(botViews)?.open(decision.conversation),
          }))
      : [],
})
