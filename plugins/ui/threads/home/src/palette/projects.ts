import { pcs } from '@sand/devices-contract'
import { palette, type PaletteItem, type PaletteItemAction, type PalettePage } from '@sand/palette/contract'
import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import { quickProject, type ProjectEntry, type ProjectGroup } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Start, StartParts } from '../launch/start'
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

const pinAction = ({ projects }: StartParts, group: ProjectGroup): PaletteItemAction => ({
  label: group.pinned ? 'Unpin' : 'Pin',
  icon: 'pin',
  returnAfter: true,
  run: () => projects.pin(group, !group.pinned),
})

const archiveAction = ({ projects }: StartParts, group: ProjectGroup): PaletteItemAction => ({
  label: group.archived ? 'Unarchive' : 'Archive',
  icon: group.archived ? 'up' : 'archive',
  returnAfter: true,
  run: () => projects.archive(group, !group.archived),
})

const renameAction = ({ ctx, projects }: StartParts, group: ProjectGroup): PaletteItemAction => ({
  label: 'Rename…',
  icon: 'pencil',
  returnAfter: true,
  async run() {
    const name = oneLine((await ctx.get(picker)?.input('Rename project', group.name)) ?? '')
    if (name && name !== group.name) await projects.rename(group, name)
  },
})

const startAction = (parts: StartParts, start: Start, location: ProjectEntry): PaletteItemAction => ({
  label: `Start on ${pcName(parts.ctx, location.device)}`,
  icon: parts.ctx.get(pcs)?.get(location.device)?.home === false ? 'monitor' : 'laptop',
  run: () => start(location.path, location.device),
})

const actionsOf = (parts: StartParts, start: Start, place: Place) => {
  const { ctx, threads } = parts
  const { group } = place
  const starts = otherLocations(ctx, group, threads.device()).map(location => startAction(parts, start, location))
  const rename = ctx.get(picker) ? [renameAction(parts, group)] : []
  return [...starts, ...rename, pinAction(parts, group), archiveAction(parts, group)]
}

const projectItem = (parts: StartParts, start: Start, place: Place): PaletteItem => {
  const { ctx } = parts
  return {
    id: `project:${place.id}`,
    group: 'Projects',
    avatar: place.shown.name,
    avatarIcon: place.shown.icon,
    label: place.shown.name,
    detail: placeDetail(parts, place),
    ...(place.group.archived && { meta: 'Archived' }),
    search: `${place.shown.name} ${place.group.locations.map(location => location.path).join(' ')} ${pcNames(ctx, place).join(' ')}`,
    actions: actionsOf(parts, start, place),
    run: () => start(place.path, place.device),
  }
}

export const projectItems = (parts: StartParts, start: Start) => places(parts, parts.projects.groups()).map(place => projectItem(parts, start, place))

export const archivedItems = (parts: StartParts, start: Start) => places(parts, parts.projects.archived()).map(place => projectItem(parts, start, place))

const quickItem = (parts: StartParts, start: Start): PaletteItem => ({
  id: 'no-project',
  label: quickProject.name,
  avatar: quickProject.name,
  avatarIcon: quickProject.icon,
  search: 'no project quick scratch',
  run: () => start('', parts.threads.device()),
})

export const projectPage = (parts: StartParts, start: Start): PalettePage => ({
  id: 'new-thread',
  title: 'Choose a project',
  placeholder: 'Search projects',
  browse: true,
  empty: query => `No projects match “${query.trim()}”`,
  items: query => [
    ...projectItems(parts, start).map(item => ({ ...item, group: undefined })),
    quickItem(parts, start),
    ...(parts.ctx.get(palette)?.items('new-thread', query) ?? []),
  ],
})
