import { composer } from '@sand/composer/contract'
import { picker, type Picker } from '@sand/picker/contract'
import { settings } from '@sand/settings/contract'
import type { IconName } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { byRecent } from './places'

export interface Entry {
  label: string
  icon: IconName
  disabled?: boolean
  run(): void | Promise<unknown>
}

const rename = async (ctx: ProjectsContext, ask: Picker, group: ProjectGroup) => {
  const name = oneLine((await ask.input('Rename project', group.name)) ?? '')
  if (name && name !== group.name) await ctx.projects.rename(group, name)
}

export const startable = (ctx: ProjectsContext, entry: ProjectEntry) => !entry.missing && ctx.pcs.online(entry.device)

export const openAt = async (ctx: ProjectsContext, entry: ProjectEntry) => {
  await ctx.threads.draft(entry.path, entry.device)
  ctx.get(settings)?.close()
  ctx.get(composer)?.focus()
}

const openThread = async (ctx: ProjectsContext, group: ProjectGroup) => {
  const target = byRecent(group.locations).find(entry => startable(ctx, entry))
  if (target) await openAt(ctx, target)
}

const renameEntry = (ctx: ProjectsContext, group: ProjectGroup): Entry[] => {
  const ask = ctx.get(picker)
  return ask ? [{ label: 'Rename…', icon: 'pencil', run: () => rename(ctx, ask, group) }] : []
}

export const projectEntries = (ctx: ProjectsContext, group: ProjectGroup): Entry[] => [
  { label: 'New thread', icon: 'message', disabled: !group.locations.some(entry => startable(ctx, entry)), run: () => openThread(ctx, group) },
  ...renameEntry(ctx, group),
]

export const copyEntries = (ctx: ProjectsContext, group: ProjectGroup): Entry[] =>
  group.locations.map(entry => ({
    label: `Forget copy on ${ctx.pcs.name(entry.device)}`,
    icon: 'x',
    run: () => ctx.projects.removeCopy(entry),
  }))

export const visibilityEntry = (ctx: ProjectsContext, group: ProjectGroup): Entry => ({
  label: group.hidden ? 'Show in sand' : 'Hide from sand',
  icon: 'eye',
  run: () => ctx.projects.hide(group, !group.hidden),
})
