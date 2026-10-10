import type { Drafts } from '@sand/composer-card/contract'
import { copyText, errorMessage, type NavAction } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { renamePage } from './palette/session'
import { snoozeActions } from './snooze/actions'

type Ctx = Context<'threads'>

const attempt = (ctx: Ctx, failed: string, work: () => Promise<unknown>) => () =>
  work().catch(error => ctx.notify?.push(`${failed}: ${errorMessage(error)}`, { level: 'error' }))

const copy = (ctx: Ctx, text: string, what: string) => async () => {
  const copied = await copyText(text)
  ctx.notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
}

const rename = async (ctx: Ctx, thread: Thread) => {
  if (ctx.palette) return ctx.palette.open(renamePage(ctx, thread))
  const name = (await ctx.picker?.input('Rename thread', thread.info.title ?? ''))?.replace(/\s+/g, ' ').trim()
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
  if (ctx.threads.current()?.id === thread.id) await ctx.threads.select(undefined)
  await ctx.threads.remove(thread.id)
}

const openActions = (ctx: Ctx, thread: Thread): NavAction[] => [
  { id: 'open-tab', group: 'open', label: 'Open in new tab', icon: 'external', run: () => void window.open(ctx.threads.link(thread.id), '_blank', 'noopener') },
  ...(ctx.palette || ctx.picker ? [{ id: 'rename', group: 'open', label: 'Rename', icon: 'pencil', tile: true, run: attempt(ctx, 'Could not rename', () => rename(ctx, thread)) }] : []),
  ...(ctx.wire && thread.info.messages
    ? [{ id: 'retitle', group: 'open', label: 'Regenerate name', icon: 'sparkles', run: attempt(ctx, 'Could not rename', () => retitle(ctx, thread)) }]
    : []),
  ...(!thread.device && thread.info.messages
    ? [{ id: 'branch', group: 'open', label: 'Branch', icon: 'branch', run: attempt(ctx, 'Could not branch', () => branch(ctx, thread)) }]
    : []),
]

const organiseActions = (ctx: Ctx, thread: Thread): NavAction[] => {
  const pinned = Boolean(thread.info.pinned)
  const settled = Boolean(thread.info.settled)
  return [
    { id: 'pin', group: 'organise', label: pinned ? 'Unpin' : 'Pin', icon: 'pin', quick: true, active: pinned, run: () => ctx.threads.pin(thread.id, !pinned) },
    { id: 'settle', group: 'organise', label: settled ? 'Un-settle' : 'Settle', icon: settled ? 'up' : 'check', quick: true, active: settled, run: () => ctx.threads.settle(thread.id, !settled) },
    ...snoozeActions(ctx, thread),
  ]
}

const copyActions = (ctx: Ctx, thread: Thread): NavAction[] => [
  { id: 'copy-link', group: 'copy', label: 'Copy link', icon: 'link', run: copy(ctx, ctx.threads.link(thread.id), 'link') },
  ...(thread.info.cwd ? [{ id: 'copy-path', group: 'copy', label: 'Copy folder path', icon: 'folder', run: copy(ctx, thread.info.cwd, 'folder path') }] : []),
]

const deleteAction = (ctx: Ctx, thread: Thread): NavAction[] =>
  thread.running
    ? []
    : [
        {
          id: 'delete',
          group: 'danger',
          label: 'Delete',
          icon: 'trash',
          danger: true,
          confirm: `Delete “${thread.info.title ?? 'Untitled thread'}”? This can’t be undone.`,
          run: attempt(ctx, 'Could not delete', () => remove(ctx, thread)),
        },
      ]

export const threadMenu = (ctx: Ctx, id: string): NavAction[] => {
  const thread = ctx.threads.get(id)
  if (!thread || thread.info.kind === 'agent') return []
  return [...openActions(ctx, thread), ...organiseActions(ctx, thread), ...copyActions(ctx, thread), ...deleteAction(ctx, thread)]
}

export const draftMenu = (drafts: Drafts, id: string): NavAction[] => [{ id: 'discard', label: 'Discard draft', icon: 'x', quick: true, danger: true, run: () => drafts.remove(id) }]
