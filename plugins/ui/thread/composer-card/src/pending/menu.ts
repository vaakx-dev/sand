import type { Pending } from '@sand/steering/contract'
import { oneLine } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec } from '@sand/protocol'
import type { Context } from 'drydock'
import { split } from '../attachments/content'

export type Act = (run: (thread: string) => Promise<unknown>) => void

export const pendingMenu = (ctx: Context<'threads' | 'turns'>, act: Act, item: Pending): MenuSpec => ({
  title: 'After this turn',
  subtitle: oneLine(item.label, 60),
  actions: [
    { id: 'copy', label: 'Copy message', icon: 'copy', group: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, split(item.prompt).text || item.label, 'message') },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, run: () => act(thread => ctx.turns.withdraw(thread, item.id)) },
  ],
})
