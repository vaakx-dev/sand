import type { Pending } from '@sand/steering/contract'
import type { Thread } from '@sand/web-client/contract'
import { errorMessage, promptContent, userParts } from '@sand/kit'
import type { Context } from 'drydock'
import type { Row, RowContext } from './row'
import { userMessage } from './user'

const pendingRow = (ctx: Context<'turns'>, thread: string, pending: Pending, context: RowContext) => {
  const remove = () =>
    ctx.turns.withdraw(thread, pending.id).catch(error => ctx.notify?.push(`Could not remove the message: ${errorMessage(error)}`, { level: 'error' }))
  const parts = userParts({ role: 'user', content: promptContent(pending.prompt) })
  return userMessage({ kind: 'user', key: pending.id, parts, steer: true, at: pending.at }, context, () => [
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, run: remove },
  ])
}

export const pendingRows = (ctx: Context<'turns'>, thread: Thread, context: RowContext): Row[] =>
  thread.queued.map(pending => pendingRow(ctx, thread.id, pending, context))
