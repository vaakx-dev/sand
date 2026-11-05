import type { PendingItem } from '@sand/turns-contract/contract'
import type { Thread } from '@sand/web-client/contract'
import type { NavAction } from '@sand/nav/contract'
import { type Entry, promptContent, userParts } from '@sand/chats/contract'
import { div } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { taggedItems, untagged } from '../parts/thread/tagged'
import { itemRows } from './index'
import type { Row, RowContext } from './row'
import { userMessage } from './user'

type Look = 'steer' | 'queued' | 'held'

const captions: Record<Look, string | undefined> = {
  steer: undefined,
  queued: 'Queued for the next turn',
  held: 'Held — the turn stopped before this was sent',
}

const lookOf = ({ kind, held }: PendingItem): Look => {
  if (held) return 'held'
  return kind === 'steer' ? 'steer' : 'queued'
}

const removeAction = (ctx: ChatContext, thread: Thread, pending: PendingItem): NavAction => ({
  id: 'remove',
  label: 'Remove',
  icon: 'x',
  group: 'remove',
  danger: true,
  run: () => ctx.turns.withdraw(thread.id, pending.id).catch(error => ctx.report(error)),
})

const resumeAction = (ctx: ChatContext, thread: Thread, pending: PendingItem): NavAction => ({
  id: 'resume',
  label: thread.running ? 'Resume' : 'Send now',
  icon: 'up',
  run: () => ctx.turns.hold(thread.id, pending.id, false).catch(error => ctx.report(error)),
})

const note = (context: RowContext, caption: string, resume: NavAction | undefined) => () => {
  const { metaLine, secondaryAction } = context.kit
  return div(
    { class: 'flex min-w-0 items-center gap-3' },
    metaLine(caption),
    resume && secondaryAction({ size: 'sm', onClick: () => void resume.run() }, resume.label),
  )
}

const rowsOf = (ctx: ChatContext, thread: Thread, pending: PendingItem, context: RowContext): Row[] => {
  const look = lookOf(pending)
  const caption = captions[look]
  const resume = look === 'held' ? resumeAction(ctx, thread, pending) : undefined
  const actions = [...(resume ? [resume] : []), removeAction(ctx, thread, pending)]
  const parts = userParts({ role: 'user', content: promptContent(pending.prompt) })
  const custom = (type: string) => Boolean(context.registry.entryRenderer(type))
  const entry: Entry = { id: pending.id, session: thread.id, parent: null, at: pending.at, type: 'message', data: null, seq: 0 }
  const shown = untagged(parts, custom)
  const key = [pending.id, look, resume?.label].filter(Boolean).join(':')
  const asked = shown.length
    ? [userMessage({ kind: 'user', key, parts: shown, steer: true, at: pending.at }, context, () => actions, caption ? note(context, caption, resume) : undefined)]
    : []
  return [...taggedItems(entry, parts, custom).flatMap(item => itemRows(item, context)), ...asked]
}

export const pendingRows = (ctx: ChatContext, thread: Thread, context: RowContext): Row[] =>
  thread.pending.flatMap(pending => rowsOf(ctx, thread, pending, context))
