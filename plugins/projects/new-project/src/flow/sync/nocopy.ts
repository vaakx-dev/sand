import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { Machine, ProjectGroup } from '@sand/web-client/contract'
import type { CopyDone } from '../../contract'
import type { ProjectsContext } from '../../context'
import { folderPage } from '../folder'
import { reviewPage } from '../review'
import type { Choice } from '../types'
import { destinationPage } from './destination'

const asCopy = (ctx: ProjectsContext, group: ProjectGroup, then?: CopyDone) => (choice: Choice) => reviewPage(ctx, { ...choice, project: group.id, done: then })

const copySources = (ctx: ProjectsContext, group: ProjectGroup, target?: string) =>
  group.locations
    .filter(location => !location.missing && location.device !== target && ctx.machines.get(location.device)?.online)
    .sort((a, b) => b.updated - a.updated)

const cloneItem = (ctx: ProjectsContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem[] => {
  const url = group.remote
  if (!url) return []
  return [
    {
      id: 'no-copy:clone',
      icon: 'branch',
      label: 'Clone from git remote',
      detail: url,
      page: () => folderPage(ctx, machine, asCopy(ctx, group, then), { url, name: group.name }),
    },
  ]
}

const syncItems = (ctx: ProjectsContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem[] => {
  const sync = ctx.sync
  if (!sync) return []
  return copySources(ctx, group, machine.device).map(location => ({
    id: `no-copy:sync:${location.device ?? ''}`,
    icon: 'copy',
    label: `Sync from ${ctx.machines.name(location.device)}`,
    detail: location.path,
    page: () => destinationPage(ctx, sync, group, { path: location.path, device: location.device }, machine, then),
  }))
}

const folderItem = (ctx: ProjectsContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem => ({
  id: 'no-copy:folder',
  icon: 'folder',
  label: `Use a folder already on ${machine.name}`,
  detail: `Link an existing folder as the copy of ${group.name}`,
  page: () => folderPage(ctx, machine, asCopy(ctx, group, then)),
})

export const noCopyPage = (ctx: ProjectsContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PalettePage => ({
  id: 'no-copy',
  title: `${group.name} has no copy on ${machine.name}`,
  filter: false,
  items: () => [...cloneItem(ctx, group, machine, then), ...syncItems(ctx, group, machine, then), folderItem(ctx, group, machine, then)],
})
