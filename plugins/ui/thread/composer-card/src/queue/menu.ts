import type { Pending } from '@sand/steering/contract'
import type { MenuSpec, NavAction } from '@sand/dom'
import type { Context } from 'drydock'
import { split } from '../attachments/content'
import { copier } from '../menu/copy'
import type { Model } from '../model'

export type Act = (run: (thread: string) => Promise<unknown>) => void

const preview = (text: string) => (text.length > 60 ? `${text.slice(0, 60)}…` : text)

export const queueMenu = (ctx: Context<'threads' | 'turns'>, model: Model, act: Act, item: Pending, steer: boolean): MenuSpec => {
  const text = split(item.prompt).text || item.label
  const actions: NavAction[] = [
    ...(steer
      ? []
      : [
          { id: 'edit', label: 'Edit', icon: 'pencil', group: 'send', tile: true, run: () => model.edit(item) },
          {
            id: 'promote',
            label: model.running.get() ? 'Steer' : 'Send now',
            icon: 'promote',
            group: 'send',
            tile: true,
            run: () => act(thread => ctx.turns.promote(thread, item.id)),
          },
        ]),
    { id: 'copy', label: 'Copy text', icon: 'copy', group: 'copy', run: copier(ctx, text, 'message') },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, run: () => act(thread => ctx.turns.withdraw(thread, item.id)) },
  ]
  return { title: steer ? 'Next step' : 'Queued follow-up', subtitle: preview(item.label), actions }
}
