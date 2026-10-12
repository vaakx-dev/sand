import type { Pending } from '@sand/steering/contract'
import { oneLine } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { Context } from 'drydock'
import { split } from '../attachments/content'
import type { Model } from '../model'

export type Act = (run: (thread: string) => Promise<unknown>) => void

const sendActions = (ctx: Context<'threads' | 'turns'>, model: Model, act: Act, item: Pending): NavAction[] => [
  { id: 'edit', label: 'Edit', icon: 'pencil', group: 'send', tile: true, run: () => model.edit(item) },
  {
    id: 'promote',
    label: model.running.get() ? 'Steer' : 'Send now',
    icon: 'promote',
    group: 'send',
    tile: true,
    run: () => act(thread => ctx.turns.promote(thread, item.id)),
  },
]

export const queueMenu = (ctx: Context<'threads' | 'turns'>, model: Model, act: Act, item: Pending, steer: boolean): MenuSpec => {
  const text = split(item.prompt).text || item.label
  const actions: NavAction[] = [
    ...(steer ? [] : sendActions(ctx, model, act, item)),
    { id: 'copy', label: 'Copy message', icon: 'copy', group: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, text, 'message') },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, run: () => act(thread => ctx.turns.withdraw(thread, item.id)) },
  ]
  return { title: steer ? 'Next step' : 'Queued follow-up', subtitle: oneLine(item.label, 60), actions }
}
