import type { ProjectGroup } from '@sand/protocol'
import { div, errorMessage, icon, popover, popoverItem, span } from '@sand/dom'
import { byRecent, isOnline } from './places'
import type { ProjectsContext } from './types'

interface Entry {
  label: string
  icon: string
  disabled?: boolean
  run(): void | Promise<void>
}

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const entryView = (entry: Entry, close: () => void, fail: (error: unknown) => void) =>
  popoverItem(
    {
      disabled: entry.disabled,
      onClick: () => {
        close()
        Promise.resolve(entry.run()).catch(fail)
      },
    },
    span({ class: 'inline-flex text-neutral-500' }, icon(entry.icon, 14)),
    entry.label,
  )

const rename = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const name = (await ctx.picker?.input('Rename project', group.name))?.replace(/\s+/g, ' ').trim()
  if (name && name !== group.name) await ctx.projects.rename(group, name)
}

const startThread = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const target = byRecent(group.locations).find(entry => !entry.missing && isOnline(ctx, entry.device))
  if (!target) return
  await ctx.threads.draft(target.path, target.device)
  ctx.settings?.close()
  ctx.composer?.focus()
}

const entries = (ctx: ProjectsContext, group: ProjectGroup): Entry[] => {
  const startable = group.locations.some(entry => !entry.missing && isOnline(ctx, entry.device))
  const syncFlows = ctx.syncFlows
  return [
    ...(ctx.picker ? [{ label: 'Rename', icon: 'pencil', run: () => rename(ctx, group) }] : []),
    { label: 'New thread', icon: 'compose', disabled: !startable, run: () => startThread(ctx, group) },
    ...(syncFlows ? [{ label: 'Add a folder on another PC', icon: 'folder-plus', run: () => syncFlows.add(group) }] : []),
  ]
}

export const rowMenu = (ctx: ProjectsContext, group: ProjectGroup, close: () => void) => {
  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const visibility: Entry = {
    label: group.hidden ? 'Restore' : 'Hide from sand',
    icon: 'eye',
    run: () => ctx.projects.hide(group, !group.hidden),
  }
  return popover(
    close,
    { class: 'top-full right-0 mt-1' },
    ...entries(ctx, group).map(entry => entryView(entry, close, fail)),
    separator(),
    entryView(visibility, close, fail),
  )
}
