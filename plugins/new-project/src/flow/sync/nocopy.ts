import type { CopyDone, Machine, PaletteItem, PalettePage, ProjectGroup } from '@sand/protocol'
import { folderPage } from '../folder'
import { reviewPage } from '../review'
import { deviceOf, type Choice, type FlowContext } from '../types'
import { destinationPage } from './destination'
import { pcName } from './names'
import { copySources } from './source'

const asCopy = (ctx: FlowContext, group: ProjectGroup, then?: CopyDone) => (choice: Choice) => reviewPage(ctx, { ...choice, project: group.id, done: then })

const cloneItem = (ctx: FlowContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem[] => {
  const url = group.remote
  if (!url) return []
  return [
    {
      id: 'no-copy:clone',
      icon: 'branch',
      label: 'Clone from git remote',
      detail: url,
      page: () => folderPage(ctx, machine, asCopy(ctx, group, then), { mode: 'clone', repo: { url, name: group.name } }),
    },
  ]
}

const syncItems = (ctx: FlowContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem[] => {
  const sync = ctx.sync
  if (!sync) return []
  return copySources(ctx, group, deviceOf(machine)).map(location => ({
    id: `no-copy:sync:${location.device ?? ''}`,
    icon: 'copy',
    label: `Sync from ${pcName(ctx, location.device)}`,
    detail: location.path,
    page: () => destinationPage(ctx, sync, group, { path: location.path, device: location.device }, machine, then),
  }))
}

const folderItem = (ctx: FlowContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PaletteItem => ({
  id: 'no-copy:folder',
  icon: 'folder',
  label: `Use a folder already on ${machine.name}`,
  detail: `Link an existing folder as the copy of ${group.name}`,
  page: () => folderPage(ctx, machine, asCopy(ctx, group, then), { mode: 'add' }),
})

export const noCopyPage = (ctx: FlowContext, group: ProjectGroup, machine: Machine, then?: CopyDone): PalettePage => ({
  id: 'no-copy',
  title: `${group.name} has no copy on ${machine.name}`,
  filter: false,
  items: () => [...cloneItem(ctx, group, machine, then), ...syncItems(ctx, group, machine, then), folderItem(ctx, group, machine, then)],
})
