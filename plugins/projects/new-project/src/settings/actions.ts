import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { IconName } from '@sand/dom'
import { oneLine } from '@sand/kit'
import type { ProjectsContext } from '../context'
import { byRecent, withoutCopy } from './places'

export interface Entry {
  label: string
  icon: IconName
  disabled?: boolean
  run(): void | Promise<unknown>
}

const rename = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const name = oneLine((await ctx.picker?.input('Rename project', group.name)) ?? '')
  if (name && name !== group.name) await ctx.projects.rename(group, name)
}

export const startable = (ctx: ProjectsContext, entry: ProjectEntry) => !entry.missing && ctx.machines.online(entry.device)

export const startAt = async (ctx: ProjectsContext, entry: ProjectEntry) => {
  await ctx.threads.draft(entry.path, entry.device)
  ctx.settings?.close()
  ctx.composer?.focus()
}

const startThread = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const target = byRecent(group.locations).find(entry => startable(ctx, entry))
  if (target) await startAt(ctx, target)
}

export const projectEntries = (ctx: ProjectsContext, group: ProjectGroup): Entry[] => {
  const syncFlows = ctx.syncFlows
  return [
    ...(ctx.picker ? [{ label: 'Rename', icon: 'pencil', run: () => rename(ctx, group) } satisfies Entry] : []),
    { label: 'New thread', icon: 'compose', disabled: !group.locations.some(entry => startable(ctx, entry)), run: () => startThread(ctx, group) },
    ...(syncFlows ? [{ label: 'Add a copy on another PC', icon: 'folder-plus', disabled: !withoutCopy(ctx, group).length, run: () => syncFlows.add(group) } satisfies Entry] : []),
  ]
}

export const copyEntries = (ctx: ProjectsContext, group: ProjectGroup): Entry[] =>
  group.locations.map(entry => ({
    label: `Forget copy on ${ctx.machines.name(entry.device)}`,
    icon: 'x',
    run: () => ctx.projects.removeCopy(entry),
  }))

export const visibilityEntry = (ctx: ProjectsContext, group: ProjectGroup): Entry => ({
  label: group.hidden ? 'Restore' : 'Hide from sand',
  icon: 'eye',
  run: () => ctx.projects.hide(group, !group.hidden),
})
