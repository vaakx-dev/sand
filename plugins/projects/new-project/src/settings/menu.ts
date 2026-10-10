import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import { div, errorMessage, icon, popover, popoverItem, span } from '@sand/dom'
import { byRecent, isOnline, machineName, withoutCopy } from './places'
import { deleteItem } from './remove'
import type { ProjectsContext } from './types'

export interface Entry {
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

export const startAt = async (ctx: ProjectsContext, entry: ProjectEntry) => {
  await ctx.threads.draft(entry.path, entry.device)
  ctx.settings?.close()
  ctx.composer?.focus()
}

const startThread = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const target = byRecent(group.locations).find(entry => !entry.missing && isOnline(ctx, entry.device))
  if (target) await startAt(ctx, target)
}

export const actions = (ctx: ProjectsContext, group: ProjectGroup): Entry[] => {
  const startable = group.locations.some(entry => !entry.missing && isOnline(ctx, entry.device))
  const syncFlows = ctx.syncFlows
  return [
    ...(ctx.picker ? [{ label: 'Rename', icon: 'pencil', run: () => rename(ctx, group) }] : []),
    { label: 'New thread', icon: 'compose', disabled: !startable, run: () => startThread(ctx, group) },
    ...(syncFlows ? [{ label: 'Add a copy on another PC', icon: 'folder-plus', disabled: !withoutCopy(ctx, group).length, run: () => syncFlows.add(group) }] : []),
  ]
}

export const forgets = (ctx: ProjectsContext, group: ProjectGroup): Entry[] =>
  group.locations.map(entry => ({
    label: `Forget copy on ${machineName(ctx, entry.device)}`,
    icon: 'x',
    run: () => ctx.projects.removeCopy(entry),
  }))

export const rowMenu = (ctx: ProjectsContext, group: ProjectGroup, close: () => void) => {
  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
  const visibility: Entry = {
    label: group.hidden ? 'Restore' : 'Hide from sand',
    icon: 'eye',
    run: () => ctx.projects.hide(group, !group.hidden),
  }
  const copies = forgets(ctx, group)
  return popover(
    close,
    { class: 'top-full right-0 mt-1' },
    ...actions(ctx, group).map(entry => entryView(entry, close, fail)),
    copies.length ? separator() : null,
    ...copies.map(entry => entryView(entry, close, fail)),
    separator(),
    entryView(visibility, close, fail),
    deleteItem(ctx, group, close, fail),
  )
}
