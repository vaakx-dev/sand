import type { Machine, PaletteItem, PalettePage, ProjectRef, Sync } from '@sand/protocol'
import { folderPage } from '../folder'
import { absolute, join, short } from '../paths'
import { deviceOf, type FlowContext } from '../types'
import { copyReviewPage } from './copyReview'
import type { CopyPlan } from './plan'

export const destinationPage = (ctx: FlowContext, sync: Sync, name: string, from: ProjectRef, machine: Machine): PalettePage => {
  const device = deviceOf(machine)
  const place = ctx.projects.place(device)
  const suggested = join(place.root, name, place.sep)
  const inspected = sync.inspect(from)
  let blocked = ''

  const planFor = async (path: string, exists: boolean): Promise<CopyPlan> => {
    const to = { path: absolute(path, place), device }
    const existing = exists ? ((await sync.refresh(to).catch(() => undefined))?.files ?? 0) : 0
    return { name, from, to, inspect: await inspected, create: !exists, existing }
  }

  const elsewhere = (): PalettePage =>
    folderPage(ctx, machine, async choice => copyReviewPage(ctx, sync, await planFor(choice.path, choice.how === 'add')), { mode: 'add' })

  const items = async (): Promise<PaletteItem[]> => {
    const inspect = await inspected
    if (inspect.blocked) {
      blocked = inspect.blocked
      return []
    }
    const listing = await ctx.projects.browse(place.root, device).catch(() => undefined)
    const exists = Boolean(listing?.folders.includes(name))
    const plan = await planFor(suggested, exists)
    const first: PaletteItem = {
      id: 'destination:suggested',
      icon: 'folder',
      label: short(suggested, place),
      detail: exists ? `A ${name} folder is already here. Link it instead of copying` : `New folder on ${machine.name}`,
      page: () => copyReviewPage(ctx, sync, plan),
    }
    return [first, { id: 'destination:elsewhere', icon: 'folder-plus', label: 'Somewhere else...', page: elsewhere }]
  }

  return {
    id: 'copy-destination',
    title: `Copy ${name} to ${machine.name}`,
    filter: false,
    empty: () => blocked,
    items,
  }
}
