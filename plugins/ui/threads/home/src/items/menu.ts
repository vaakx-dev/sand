import { threadRoute } from '@sand/chat/contract'
import type { Drafts } from '@sand/composer/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { MenuAction, Shell } from '@sand/ui-shell/contract'
import type { Projects, Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { snoozeAction } from '../snooze/actions'
import { attempt } from './failure'
import { canRename, renameThread } from './rename'

export interface MenuParts {
  ctx: Context
  kit: Kit
  threads: Threads
  projects: Projects
  shell: Shell
}

const remove = async ({ threads, shell }: MenuParts, thread: Thread) => {
  const current = threads.current()?.id === thread.id
  await threads.remove(thread.id)
  if (current) shell.land({ forget: { kind: threadRoute, id: thread.id } })
}

const openActions = (parts: MenuParts, thread: Thread): MenuAction[] => [
  { id: 'open-tab', group: 'open', label: 'Open in new tab', icon: 'external', run: () => parts.kit.openTab(parts.shell.link({ kind: threadRoute, id: thread.id })) },
  ...(canRename(parts.ctx)
    ? [{ id: 'rename', group: 'open', label: 'Rename…', icon: 'pencil', tile: true, run: () => attempt(parts.ctx, "Couldn't rename", () => renameThread(parts.ctx, parts.threads, thread)) }]
    : []),
]

const organiseActions = ({ ctx, threads }: MenuParts, thread: Thread): MenuAction[] => {
  const pinned = thread.info.pinned
  const settled = Boolean(thread.info.settled)
  return [
    { id: 'pin', group: 'organise', label: pinned ? 'Unpin' : 'Pin', icon: 'pin', quick: true, active: pinned, run: () => attempt(ctx, "Couldn't pin", () => threads.update(thread.id, { pinned: !pinned })) },
    {
      id: 'settle',
      group: 'organise',
      label: settled ? 'Un-settle' : 'Settle',
      icon: settled ? 'up' : 'check',
      quick: true,
      active: settled,
      run: () => attempt(ctx, settled ? "Couldn't un-settle" : "Couldn't settle", () => threads.update(thread.id, { settled: !settled })),
    },
    snoozeAction(threads, thread),
  ]
}

const copyActions = ({ kit, shell }: MenuParts, thread: Thread): MenuAction[] => [
  { id: 'copy-link', group: 'copy', label: 'Copy link', icon: 'link', run: () => kit.copyText(shell.link({ kind: threadRoute, id: thread.id })) },
  { id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'folder', run: () => kit.copyText(thread.info.cwd) },
]

const deleteAction = (parts: MenuParts, thread: Thread): MenuAction => ({
  id: 'delete',
  group: 'danger',
  label: 'Delete',
  icon: 'trash',
  danger: true,
  confirm: `Delete “${thread.info.title || 'Untitled thread'}”? This can’t be undone.`,
  run: () => remove(parts, thread),
})

export const threadMenu = (parts: MenuParts, id: string): MenuAction[] => {
  const thread = parts.threads.get(id)
  if (!thread || thread.info.kind === 'agent') return []
  const actions = [...openActions(parts, thread), ...organiseActions(parts, thread), ...copyActions(parts, thread)]
  return thread.running ? actions : [...actions, deleteAction(parts, thread)]
}

export const draftMenu = (drafts: Drafts, id: string): MenuAction[] => [
  { id: 'discard', label: 'Discard draft', icon: 'x', quick: true, danger: true, confirm: 'Discard this draft? Its text is lost.', run: () => drafts.remove(id) },
]
