import { toastsOf } from '@sand/toasts/contract'
import type { PendingItem } from '@sand/turns-contract/contract'
import type { Thread } from '@sand/web-client/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { type Entry, promptContent, userParts } from '@sand/chats/contract'
import { div } from '@vaakx-dev/vrui'
import type { Item, Row, Rows } from '@sand/transcript/contract'
import type { ChatContext } from '../context'

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

const removeAction = (ctx: ChatContext, thread: Thread, pending: PendingItem): MenuAction => ({
  id: 'remove',
  label: 'Remove',
  icon: 'x',
  group: 'remove',
  danger: true,
  run: () => toastsOf(ctx).attempt('Couldn’t remove the message', () => ctx.turns.withdraw(thread.id, pending.id)),
})

const resumeAction = (ctx: ChatContext, thread: Thread, pending: PendingItem): MenuAction => ({
  id: 'resume',
  label: thread.running ? 'Resume' : 'Send now',
  icon: 'up',
  run: () => toastsOf(ctx).attempt('Couldn’t send the message', () => ctx.turns.hold(thread.id, pending.id, false)),
})

const note = (ctx: ChatContext, caption: string, resume: MenuAction | undefined) => () => {
  const { linkButton, metaLine } = ctx.kit
  return div(
    { class: 'flex min-w-0 items-center gap-3 px-1' },
    metaLine(caption),
    resume && linkButton({ class: 'text-xs', onClick: () => void resume.run() }, resume.label),
  )
}

const rowsOf = (ctx: ChatContext, thread: Thread, pending: PendingItem, rows: Rows): Row[] => {
  const look = lookOf(pending)
  const caption = captions[look]
  const resume = look === 'held' ? resumeAction(ctx, thread, pending) : undefined
  const actions = [...(resume ? [resume] : []), removeAction(ctx, thread, pending)]
  const entry: Entry = { id: pending.id, session: thread.id, parent: null, at: pending.at, type: 'message', data: null, seq: 0 }
  const key = [pending.id, look, resume?.label].filter(Boolean).join(':')
  const shown = (item: Item) =>
    item.kind === 'user' ? [rows.user({ ...item, key }, () => actions, caption ? note(ctx, caption, resume) : undefined)] : rows.item(item)
  return ctx.transcriptParts.prompt(entry, userParts({ role: 'user', content: promptContent(pending.prompt) })).flatMap(shown)
}

export const pendingRows = (ctx: ChatContext, thread: Thread, rows: Rows): Row[] => thread.pending.flatMap(pending => rowsOf(ctx, thread, pending, rows))
