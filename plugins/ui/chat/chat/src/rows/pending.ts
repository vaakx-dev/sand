import type { Entry } from '@sand/chats/contract'
import type { Pending } from '@sand/steering/contract'
import type { Thread } from '@sand/web-client/contract'
import { promptContent, userParts } from '@sand/chats/prompt'
import type { ChatContext } from '../context'
import { taggedItems, untagged } from '../parts/thread/tagged'
import { itemRows } from './index'
import type { Row, RowContext } from './row'
import { userMessage } from './user'

const queuedRows = (ctx: ChatContext, thread: string, pending: Pending, context: RowContext): Row[] => {
  const remove = () => ctx.turns.withdraw(thread, pending.id).catch(() => {})
  const parts = userParts({ role: 'user', content: promptContent(pending.prompt) })
  const custom = (type: string) => Boolean(context.registry.entryRenderer(type))
  const entry: Entry = { id: pending.id, session: thread, parent: null, at: pending.at, type: 'message', data: null }
  const shown = untagged(parts, custom)
  const asked = shown.length
    ? [userMessage({ kind: 'user', key: pending.id, parts: shown, steer: true, at: pending.at }, context, () => [
        { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, run: remove },
      ])]
    : []
  return [...taggedItems(entry, parts, custom).flatMap(item => itemRows(item, context)), ...asked]
}

export const pendingRows = (ctx: ChatContext, thread: Thread, context: RowContext): Row[] =>
  thread.queued.flatMap(pending => queuedRows(ctx, thread.id, pending, context))
