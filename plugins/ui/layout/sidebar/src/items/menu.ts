import type { Drafts } from '@sand/composer/contract'
import type { NavAction } from '@sand/nav/contract'
import { palette } from '@sand/palette/contract'
import { picker } from '@sand/picker/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { renamePage } from '../palette/session'
import { snoozeAction } from '../snooze/actions'
import { attempt } from './failure'

interface MenuParts {
  ctx: Context
  kit: Kit
  threads: Threads
}

const rename = async ({ ctx, threads }: MenuParts, thread: Thread) => {
  const found = ctx.get(palette)
  if (found) return found.open(renamePage(threads, thread))
  const name = oneLine((await ctx.get(picker)?.input('Rename thread', thread.info.title)) ?? '')
  if (name && name !== thread.info.title) await threads.rename(thread.id, name)
}

const remove = async ({ threads }: MenuParts, thread: Thread) => {
  if (threads.current()?.id === thread.id) await threads.select(undefined, { replace: true })
  await threads.remove(thread.id)
}

const openActions = (parts: MenuParts, thread: Thread): NavAction[] => [
  { id: 'open-tab', group: 'open', label: 'Open in new tab', icon: 'external', run: () => parts.kit.openTab(parts.threads.link(thread.id)) },
  { id: 'rename', group: 'open', label: 'Rename…', icon: 'pencil', tile: true, run: () => attempt(parts.ctx, "Couldn't rename", () => rename(parts, thread)) },
]

const organiseActions = ({ ctx, threads }: MenuParts, thread: Thread): NavAction[] => {
  const pinned = thread.info.pinned
  const settled = Boolean(thread.info.settled)
  return [
    { id: 'pin', group: 'organise', label: pinned ? 'Unpin' : 'Pin', icon: 'pin', quick: true, active: pinned, run: () => attempt(ctx, "Couldn't pin", () => threads.pin(thread.id, !pinned)) },
    {
      id: 'settle',
      group: 'organise',
      label: settled ? 'Un-settle' : 'Settle',
      icon: settled ? 'up' : 'check',
      quick: true,
      active: settled,
      run: () => attempt(ctx, settled ? "Couldn't un-settle" : "Couldn't settle", () => threads.settle(thread.id, !settled)),
    },
    snoozeAction(threads, thread),
  ]
}

const copyActions = ({ kit, threads }: MenuParts, thread: Thread): NavAction[] => [
  { id: 'copy-link', group: 'copy', label: 'Copy link', icon: 'link', run: () => kit.copyText(threads.link(thread.id)) },
  { id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'folder', run: () => kit.copyText(thread.info.cwd) },
]

const deleteAction = (parts: MenuParts, thread: Thread): NavAction => ({
  id: 'delete',
  group: 'danger',
  label: 'Delete',
  icon: 'trash',
  danger: true,
  confirm: `Delete “${thread.info.title || 'Untitled thread'}”? This can’t be undone.`,
  run: () => attempt(parts.ctx, "Couldn't delete", () => remove(parts, thread)),
})

export const threadMenu = (parts: MenuParts, id: string): NavAction[] => {
  const thread = parts.threads.get(id)
  if (!thread || thread.info.kind === 'agent') return []
  const actions = [...openActions(parts, thread), ...organiseActions(parts, thread), ...copyActions(parts, thread)]
  return thread.running ? actions : [...actions, deleteAction(parts, thread)]
}

export const draftMenu = (drafts: Drafts, id: string): NavAction[] => [
  { id: 'discard', label: 'Discard draft', icon: 'x', quick: true, danger: true, run: () => drafts.remove(id) },
]
