import type { PaletteItem, PaletteItemAction, PalettePage, ProjectGroup } from '@sand/protocol'
import type { Context } from 'drydock'
import { projectLookup } from '../project-lookup'
import { pcNames, places, shortPath, type Place } from './places'

const placeDetail = (ctx: Context, place: Place) => `${pcNames(ctx, place).join(', ')} · ${shortPath(ctx, place.path, place.device)}`

const hideAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Hide',
  danger: true,
  run: () => ctx.projects?.hide(group, true),
})

const renameAction = (ctx: Context, group: ProjectGroup): PaletteItemAction => ({
  label: 'Rename',
  async run() {
    const name = (await ctx.picker?.input('Rename project', group.name))?.replace(/\s+/g, ' ').trim()
    if (name && name !== group.name) await ctx.projects?.rename(group, name)
  },
})

const actionsOf = (ctx: Context, place: Place) => {
  const group = place.group
  if (!group || !ctx.projects) return undefined
  return [...(ctx.picker ? [renameAction(ctx, group)] : []), hideAction(ctx, group)]
}

const projectItem = (ctx: Context<'threads'>, place: Place): PaletteItem => ({
  id: `project:${place.id}`,
  group: 'Projects',
  avatar: place.name,
  avatarIcon: place.group
    ? place.group.locations.map(location => ctx.projects?.icon(location.path, location.device)).find(Boolean)
    : ctx.projects?.icon(place.path, place.device),
  label: place.name,
  detail: placeDetail(ctx, place),
  search: `${place.name} ${(place.group?.locations ?? [place]).map(location => location.path).join(' ')} ${pcNames(ctx, place).join(' ')}`,
  actions: actionsOf(ctx, place),
  run: () => ctx.threads.draft(place.path, place.device).then(() => ctx.composer?.focus()),
})

export const projectItems = (ctx: Context<'threads'>) => places(ctx).map(place => projectItem(ctx, place))

export const newThreadPage = (ctx: Context<'threads'>): PalettePage => ({
  id: 'new-thread',
  title: 'New thread in…',
  placeholder: 'Search projects…',
  empty: 'No matching projects.',
  items(query) {
    const projects = projectItems(ctx).map(item => ({ ...item, group: undefined }))
    return [...projects.slice(0, 1), ...(ctx.palette?.items('new-thread', query) ?? []), ...projects.slice(1)]
  },
})
