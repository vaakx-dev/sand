import { toastsOf } from '@sand/toasts/contract'
import type { PendingItem } from '@sand/turns-contract/contract'
import type { OutboxItem, Thread } from '@sand/web-client/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { type Entry, promptContent, userParts } from '@sand/chats/contract'
import { div } from '@vaakx-dev/vrui'
import type { Item, Row, Rows } from '@sand/transcript/contract'
import type { ChatContext } from '../context'

type Look = 'sending' | 'steer' | 'queued' | 'held'

interface Shown {
  item: Pick<PendingItem, 'id' | 'prompt' | 'at'>
  look: Look
  actions: MenuAction[]
  resume?: MenuAction
}

const captions: Record<Look, string | undefined> = {
  sending: 'Sending�',
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

const queuedOf = (ctx: ChatContext, thread: Thread, pending: PendingItem): Shown => {
  const look = lookOf(pending)
  const resume = look === 'held' ? resumeAction(ctx, thread, pending) : undefined
  return { item: pending, look, resume, actions: [...(resume ? [resume] : []), removeAction(ctx, thread, pending)] }
}

const sendingOf = (item: OutboxItem): Shown => ({ item, look: 'sending', actions: [] })

const rowsOf = (ctx: ChatContext, thread: Thread, { item, look, actions, resume }: Shown, rows: Rows): Row[] => {
  const caption = captions[look]
  const entry: Entry = { id: item.id, session: thread.id, parent: null, at: item.at, type: 'message', data: null, seq: 0 }
  const key = [item.id, look, resume?.label].filter(Boolean).join(':')
  const shown = (part: Item) =>
    part.kind === 'user' ? [rows.user({ ...part, key }, () => actions, caption ? note(ctx, caption, resume) : undefined)] : rows.item(part)
  return ctx.transcriptParts.prompt(entry, userParts({ role: 'user', content: promptContent(item.prompt) })).flatMap(shown)
}

export const pendingRows = (ctx: ChatContext, thread: Thread, rows: Rows): Row[] =>
  [...thread.pending.map(pending => queuedOf(ctx, thread, pending)), ...thread.sending.map(sendingOf)].flatMap(shown => rowsOf(ctx, thread, shown, rows))
