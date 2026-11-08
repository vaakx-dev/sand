import { picker } from '@sand/picker/contract'
import { homeRoute, type MenuAction, type Shell } from '@sand/ui-shell/contract'
import { oneLine } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import type { ChatContext } from '../context'

export const threadTitle = (thread: Thread) => thread.info.title || 'Untitled thread'

const renameThread = async (ctx: ChatContext, id: string) => {
  const thread = ctx.threads.get(id)
  const ask = ctx.get(picker)
  if (!thread || !ask) return
  const title = oneLine((await ask.input('Rename thread', thread.info.title)) ?? '')
  if (title) await ctx.threads.rename(thread.id, title)
}

const removeThread = async (ctx: ChatContext, shell: Shell, id: string) => {
  shell.open({ kind: homeRoute }, { replace: true })
  await ctx.threads.remove(id)
}

export const threadActions = (ctx: ChatContext, shell: Shell, id: string): MenuAction[] => {
  const thread = ctx.threads.get(id)
  if (!thread) return []
  const rename: MenuAction[] = ctx.get(picker) ? [{ id: 'rename', label: 'Rename…', icon: 'pencil', run: () => renameThread(ctx, id) }] : []
  const remove: MenuAction[] = thread.running
    ? []
    : [{ id: 'delete', group: 'danger', label: 'Delete', icon: 'trash', danger: true, confirm: `Delete “${threadTitle(thread)}”? This can’t be undone.`, run: () => removeThread(ctx, shell, id) }]
  return [...rename, { id: 'copy-link', label: 'Copy link', icon: 'link', run: () => ctx.kit.copyText(ctx.threads.link(id)) }, ...remove]
}
