import { oneLine } from '@sand/kit'
import type { PaletteItem, PaletteItemAction, PalettePage } from '@sand/palette/contract'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { quickThreadIcon } from '@sand/dom'
import { openDraft } from '../draft'
import { otherLocations, pcName, pcNames, places, shortPath, type Place } from './places'

const awayDetail = (ctx: Context<'threads'>, place: Place) => {
  const here = pcName(ctx, ctx.threads.device())
  const others = pcNames(ctx, place).filter(name => name !== here)
  if (!others.length) return `No copy on ${here}`
  return `No copy on ${here} · on ${others.join(', ')}`
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
    const name = oneLine((await ctx.picker?.input('Rename project', group.name)) ?? '')
    if (name && name !== group.name) await ctx.projects?.rename(group, name)
  },
})

const startAction = (ctx: Context<'threads'>, location: ProjectEntry): PaletteItemAction => ({
  label: `Start on ${pcName(ctx, location.device)}`,
  icon: ctx.machines?.get(location.device)?.local === false ? 'monitor' : 'laptop',
  run: () => openDraft(ctx, location.path, location.device),
})

const actionsOf = (ctx: Context<'threads'>, place: Place) => {
  const group = place.group
  if (!group || !ctx.projects) return undefined
  const starts = otherLocations(ctx, group, ctx.threads.device()).map(location => startAction(ctx, location))
  const rename = ctx.picker ? [renameAction(ctx, group)] : []
  return [...starts, ...rename, hideAction(ctx, group)]
}

const runPlace = (ctx: Context<'threads'>, place: Place) => {
  if (place.away && place.group && ctx.syncFlows) return ctx.syncFlows.copy(place.group, ctx.threads.device())
  if (place.path) return openDraft(ctx, place.path, place.device)
}

const projectItem = (ctx: Context<'threads'>, place: Place): PaletteItem => ({
  id: `project:${place.id}`,
  group: 'Projects',
  avatar: place.name,
  avatarIcon: place.group ? ctx.projects?.groupIcon(place.group) : ctx.projects?.icon(place.path, place.device),
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
  avatar: 'Quick thread',
  avatarIcon: quickThreadIcon,
  detail: 'No project, in its own scratch folder',
  search: 'quick thread scratch no project',
  run: () => openDraft(ctx, '', ctx.threads.device()),
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
