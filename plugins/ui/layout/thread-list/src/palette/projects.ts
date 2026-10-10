import type { PaletteItem, PaletteItemAction, PalettePage } from '@sand/palette/contract'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { groupIcon } from '../project-lookup'
import { otherLocations, pcName, pcNames, places, shortPath, type Place } from './places'

const draft = (ctx: Context<'threads'>, path: string, device?: string) => ctx.threads.draft(path, device).then(() => ctx.composer?.focus())

const awayDetail = (ctx: Context<'threads'>, place: Place) => {
  const device = ctx.threads.device()
  const others = [...new Set((place.group?.locations ?? []).map(location => pcName(ctx, location.device)))].filter(name => name !== pcName(ctx, device))
  return [`No copy on ${pcName(ctx, device)}`, ...(others.length ? [`on ${others.join(', ')}`] : [])].join(' · ')
}

const placeDetail = (ctx: Context<'threads'>, place: Place) =>
  place.away ? awayDetail(ctx, place) : `${pcNames(ctx, place).join(', ')} · ${shortPath(ctx, place.path, place.device)}`

const hideAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Hide project',
  icon: 'x',
  danger: true,
  returnAfter: true,
  run: () => ctx.projects?.hide(group, true),
})

const renameAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Rename',
  icon: 'pencil',
  returnAfter: true,
  async run() {
    const name = (await ctx.picker?.input('Rename project', group.name))?.replace(/\s+/g, ' ').trim()
    if (name && name !== group.name) await ctx.projects?.rename(group, name)
  },
})

const startAction = (ctx: Context<'threads'>, location: ProjectEntry): PaletteItemAction => ({
  label: `Start on ${pcName(ctx, location.device)}`,
  icon: ctx.machines?.get(location.device)?.local === false ? 'monitor' : 'laptop',
  run: () => draft(ctx, location.path, location.device),
})

const actionsOf = (ctx: Context<'threads'>, place: Place) => {
  const group = place.group
  if (!group || !ctx.projects) return undefined
  const starts = otherLocations(ctx, group, ctx.threads.device()).map(location => startAction(ctx, location))
  return [...starts, ...(ctx.picker ? [renameAction(ctx, group)] : []), hideAction(ctx, group)]
}

const runPlace = (ctx: Context<'threads'>, place: Place) => {
  if (place.away && place.group && ctx.syncFlows) return ctx.syncFlows.copy(place.group, ctx.threads.device())
  if (place.path) return draft(ctx, place.path, place.device)
}

const projectItem = (ctx: Context<'threads'>, place: Place): PaletteItem => ({
  id: `project:${place.id}`,
  group: 'Projects',
  avatar: place.name,
  avatarIcon: place.group ? groupIcon(ctx, place.group, place.device) : ctx.projects?.icon(place.path, place.device),
  label: place.name,
  detail: placeDetail(ctx, place),
  search: `${place.name} ${(place.group?.locations ?? [place]).map(location => location.path).join(' ')} ${pcNames(ctx, place).join(' ')}`,
  actions: actionsOf(ctx, place),
  run: () => runPlace(ctx, place),
})

export const projectItems = (ctx: Context<'threads'>) => places(ctx).map(place => projectItem(ctx, place))

const quickThreadItem = (ctx: Context<'threads'>): PaletteItem => ({
  id: 'quick-thread',
  label: 'Quick thread',
  detail: 'No project, in its own scratch folder',
  search: 'quick thread scratch no project',
  run: () => draft(ctx, '', ctx.threads.device()),
})

export const newThreadPage = (ctx: Context<'threads'>): PalettePage => ({
  id: 'new-thread',
  title: 'New thread in…',
  placeholder: 'Search projects…',
  empty: 'No matching projects.',
  items(query) {
    const projects = projectItems(ctx).map(item => ({ ...item, group: undefined }))
    return [...projects.slice(0, 1), quickThreadItem(ctx), ...(ctx.palette?.items('new-thread', query) ?? []), ...projects.slice(1)]
  },
})
