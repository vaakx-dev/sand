import { pcs } from '@sand/devices-contract'
import { palette, type PaletteItem, type PaletteItemAction, type PalettePage } from '@sand/palette/contract'
import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import { projects, type ProjectEntry, type ProjectGroup } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { startChat, type StartParts } from '../launch/start'
import { otherLocations, pcName, pcNames, places, type Place } from './places'

const severalPcs = (ctx: Context) => (ctx.get(pcs)?.list().length ?? 0) > 1

const awayDetail = ({ ctx, threads }: StartParts, place: Place) => {
  const here = pcName(ctx, threads.device())
  const others = pcNames(ctx, place).filter(name => name !== here)
  if (!others.length) return `No copy on ${here}`
  return `No copy on ${here} · on ${others.join(', ')}`
}

const placeDetail = (parts: StartParts, place: Place) => {
  if (place.away) return awayDetail(parts, place)
  return severalPcs(parts.ctx) ? pcNames(parts.ctx, place).join(', ') : undefined
}

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

const startAction = (parts: StartParts, location: ProjectEntry): PaletteItemAction => ({
  label: `Start on ${pcName(parts.ctx, location.device)}`,
  icon: parts.ctx.get(pcs)?.get(location.device)?.home === false ? 'monitor' : 'laptop',
  run: () => startChat(parts, location.path, location.device),
})

const actionsOf = (parts: StartParts, place: Place) => {
  const { ctx, threads } = parts
  const group = place.group
  if (!group || !ctx.get(projects)) return undefined
  const starts = otherLocations(ctx, group, threads.device()).map(location => startAction(parts, location))
  const rename = ctx.get(picker) ? [renameAction(ctx, group)] : []
  return [...starts, ...rename, hideAction(ctx, group)]
}

const projectItem = (parts: StartParts, place: Place): PaletteItem => {
  const { ctx } = parts
  return {
    id: `project:${place.id}`,
    group: 'Projects',
    avatar: place.name,
    avatarIcon: place.group ? ctx.get(projects)?.groupIcon(place.group) : ctx.get(projects)?.icon(place.path, place.device),
    label: place.name,
    detail: placeDetail(parts, place),
    search: `${place.name} ${(place.group?.locations ?? [place]).map(location => location.path).join(' ')} ${pcNames(ctx, place).join(' ')}`,
    actions: actionsOf(parts, place),
    run: () => startChat(parts, place.path, place.device),
  }
}

export const projectItems = (parts: StartParts) => places(parts.ctx, parts.threads).map(place => projectItem(parts, place))

const noProjectItem = (parts: StartParts): PaletteItem => ({
  id: 'no-project',
  label: 'No project',
  avatar: 'No project',
  avatarIcon: { quick: true },
  search: 'no project quick scratch',
  run: () => startChat(parts, '', parts.threads.device()),
})

export const newChatPage = (parts: StartParts): PalettePage => ({
  id: 'new-thread',
  title: 'New thread',
  placeholder: 'Search projects',
  browse: true,
  empty: query => `No projects match “${query.trim()}”`,
  items: query => [
    ...projectItems(parts).map(item => ({ ...item, group: undefined })),
    noProjectItem(parts),
    ...(parts.ctx.get(palette)?.items('new-thread', query) ?? []),
  ],
})
