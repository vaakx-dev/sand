import type { Drafts } from '@sand/composer-card/contract'
import { oneLine } from '@sand/kit'
import { attempt, copyWithNotice, openTab } from '@sand/kit/web'
import type { NavAction } from '@sand/protocol'
import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { renamePage } from '../palette/session'
import { snoozeAction } from '../snooze/actions'

type Ctx = Context<'threads'>

const rename = async (ctx: Ctx, thread: Thread) => {
  if (ctx.palette) return ctx.palette.open(renamePage(ctx, thread))
  const name = oneLine((await ctx.picker?.input('Rename thread', thread.info.title ?? '')) ?? '')
  if (name && name !== thread.info.title) await ctx.threads.rename(thread.id, name)
}

const retitle = async (ctx: Ctx, thread: Thread) => {
  const title = await ctx.wire?.call<string>({ type: 'titles.rename', session: thread.id }, thread.device)
  if (title) ctx.notify?.push(`Thread renamed to ${title}`)
}

const branch = async (ctx: Ctx, thread: Thread) => {
  const copied = await ctx.threads.branch(thread.id)
  await ctx.threads.select(copied.id)
}

const remove = async (ctx: Ctx, thread: Thread) => {
  if (ctx.threads.current()?.id === thread.id) await ctx.threads.select(undefined, { replace: true })
  await ctx.threads.remove(thread.id)
}

const openActions = (ctx: Ctx, thread: Thread) => {
  const actions: NavAction[] = [
    { id: 'open-tab', group: 'open', label: 'Open in new tab', icon: 'external', run: () => openTab(ctx.threads.link(thread.id)) },
  ]
  if (ctx.palette || ctx.picker)
    actions.push({ id: 'rename', group: 'open', label: 'Rename…', icon: 'pencil', tile: true, run: () => attempt(ctx.notify, 'Could not rename', () => rename(ctx, thread)) })
  if (ctx.wire && thread.info.messages)
    actions.push({ id: 'retitle', group: 'open', label: 'Regenerate name', icon: 'sparkles', run: () => attempt(ctx.notify, 'Could not rename', () => retitle(ctx, thread)) })
  if (thread.info.messages)
    actions.push({ id: 'branch', group: 'open', label: 'Branch', icon: 'branch', run: () => attempt(ctx.notify, 'Could not branch', () => branch(ctx, thread)) })
  return actions
}

const organiseActions = (ctx: Ctx, thread: Thread): NavAction[] => {
  const pinned = Boolean(thread.info.pinned)
  const settled = Boolean(thread.info.settled)
  return [
    { id: 'pin', group: 'organise', label: pinned ? 'Unpin' : 'Pin', icon: 'pin', quick: true, active: pinned, run: () => ctx.threads.pin(thread.id, !pinned) },
    { id: 'settle', group: 'organise', label: settled ? 'Un-settle' : 'Settle', icon: settled ? 'up' : 'check', quick: true, active: settled, run: () => ctx.threads.settle(thread.id, !settled) },
    snoozeAction(ctx, thread),
  ]
}

const copyActions = (ctx: Ctx, thread: Thread) => {
  const actions: NavAction[] = [{ id: 'copy-link', group: 'copy', label: 'Copy link', icon: 'link', run: () => copyWithNotice(ctx.notify, ctx.threads.link(thread.id), 'link') }]
  if (thread.info.cwd) actions.push({ id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'folder', run: () => copyWithNotice(ctx.notify, thread.info.cwd, 'path') })
  return actions
}

const deleteAction = (ctx: Ctx, thread: Thread): NavAction => ({
  id: 'delete',
  group: 'danger',
  label: 'Delete',
  icon: 'trash',
  danger: true,
  confirm: `Delete “${thread.info.title ?? 'Untitled thread'}”? This can’t be undone.`,
  run: () => attempt(ctx.notify, 'Could not delete', () => remove(ctx, thread)),
})

export const threadMenu = (ctx: Ctx, id: string): NavAction[] => {
  const thread = ctx.threads.get(id)
  if (!thread || thread.info.kind === 'agent') return []
  const actions = [...openActions(ctx, thread), ...organiseActions(ctx, thread), ...copyActions(ctx, thread)]
  return thread.running ? actions : [...actions, deleteAction(ctx, thread)]
}

export const draftMenu = (drafts: Drafts, id: string): NavAction[] => [{ id: 'discard', label: 'Discard draft', icon: 'x', quick: true, danger: true, run: () => drafts.remove(id) }]
