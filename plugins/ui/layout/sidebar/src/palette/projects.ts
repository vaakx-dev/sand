import { composer } from '@sand/composer/contract'
import { pcs } from '@sand/devices-contract'
import { palette, type PaletteItem, type PaletteItemAction, type PalettePage } from '@sand/palette/contract'
import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import { projects, type ProjectEntry, type ProjectGroup, type Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { quickName } from '../items/lookup'
import { otherLocations, pcName, pcNames, places, shortPath, type Place } from './places'

export const openDraft = (ctx: Context, threads: Threads, path: string, device: string) => threads.draft(path, device).then(() => ctx.get(composer)?.focus())

const awayDetail = (ctx: Context, threads: Threads, place: Place) => {
  const here = pcName(ctx, threads.device())
  const others = pcNames(ctx, place).filter(name => name !== here)
  if (!others.length) return `No copy on ${here}`
  return `No copy on ${here} · on ${others.join(', ')}`
}

const placeDetail = (ctx: Context, threads: Threads, place: Place) =>
  place.away ? awayDetail(ctx, threads, place) : `${pcNames(ctx, place).join(', ')} · ${shortPath(ctx, place.path, place.device)}`

const hideAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Hide project',
  icon: 'x',
  danger: true,
  returnAfter: true,
  run: () => ctx.get(projects)?.hide(group, true),
})

const renameAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Rename…',
  icon: 'pencil',
  returnAfter: true,
  async run() {
    const name = oneLine((await ctx.get(picker)?.input('Rename project', group.name)) ?? '')
    if (name && name !== group.name) await ctx.get(projects)?.rename(group, name)
  },
})

const startAction = (ctx: Context, threads: Threads, location: ProjectEntry): PaletteItemAction => ({
  label: `Start on ${pcName(ctx, location.device)}`,
  icon: ctx.get(pcs)?.get(location.device)?.home === false ? 'monitor' : 'laptop',
  run: () => openDraft(ctx, threads, location.path, location.device),
})

const actionsOf = (ctx: Context, threads: Threads, place: Place) => {
  const group = place.group
  if (!group || !ctx.get(projects)) return undefined
  const starts = otherLocations(ctx, group, threads.device()).map(location => startAction(ctx, threads, location))
  const rename = ctx.get(picker) ? [renameAction(ctx, group)] : []
  return [...starts, ...rename, hideAction(ctx, group)]
}

const projectItem = (ctx: Context, threads: Threads, place: Place): PaletteItem => ({
  id: `project:${place.id}`,
  group: 'Projects',
  avatar: place.name,
  avatarIcon: place.group ? ctx.get(projects)?.groupIcon(place.group) : ctx.get(projects)?.icon(place.path, place.device),
  label: place.name,
  detail: placeDetail(ctx, threads, place),
  search: `${place.name} ${(place.group?.locations ?? [place]).map(location => location.path).join(' ')} ${pcNames(ctx, place).join(' ')}`,
  actions: actionsOf(ctx, threads, place),
  run: () => openDraft(ctx, threads, place.path, place.device),
})

export const projectItems = (ctx: Context, threads: Threads) => places(ctx, threads).map(place => projectItem(ctx, threads, place))

const quickThreadItem = (ctx: Context, threads: Threads): PaletteItem => ({
  id: 'quick-thread',
  label: quickName,
  avatar: quickName,
  avatarIcon: { quick: true },
  detail: 'No project, in its own scratch folder',
  search: 'quick thread task scratch no project',
  run: () => openDraft(ctx, threads, '', threads.device()),
})

export const newThreadPage = (ctx: Context, threads: Threads): PalettePage => ({
  id: 'new-thread',
  title: 'New thread in…',
  placeholder: 'Search projects…',
  empty: 'No matches',
  items(query) {
    const found = projectItems(ctx, threads).map(item => ({ ...item, group: undefined }))
    return [...found.slice(0, 1), quickThreadItem(ctx, threads), ...(ctx.get(palette)?.items('new-thread', query) ?? []), ...found.slice(1)]
  },
})
