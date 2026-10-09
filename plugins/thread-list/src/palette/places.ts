import type { ProjectEntry, ProjectGroup } from '@sand/protocol'
import type { Context } from 'drydock'
import { folderName } from '@sand/kit'
import { findGroup, isQuick, sameDevice } from '../project-lookup'

export interface Place {
  id: string
  name: string
  path: string
  device?: string
  updated: number
  group?: ProjectGroup
  away?: boolean
}

const isOnline = (ctx: Context, device?: string) => !device || !ctx.machines || Boolean(ctx.machines.get(device)?.online)

const usable = (ctx: Context, location: ProjectEntry) => !location.missing && isOnline(ctx, location.device)

export const otherLocations = (ctx: Context, group: ProjectGroup, device?: string) =>
  group.locations
    .filter(location => !sameDevice(location.device, device) && usable(ctx, location))
    .filter((location, index, all) => all.findIndex(other => sameDevice(other.device, location.device)) === index)

const groupPlace = (ctx: Context, group: ProjectGroup, device?: string): Place | undefined => {
  const here = group.locations.find(location => sameDevice(location.device, device) && !location.missing)
  const location = here ?? group.locations.find(location => usable(ctx, location)) ?? group.locations[0]
  if (!location && !ctx.syncFlows) return undefined
  return {
    id: group.id,
    name: group.name || (location ? folderName(location.path) : 'Project'),
    path: location?.path ?? '',
    device: here ? device : location?.device,
    updated: group.updated,
    group,
    away: !here,
  }
}

const quickPlace = (device?: string): Place => ({ id: `${device ?? ''}\0quick`, name: 'Quick thread', path: '', device, updated: 0 })

export const currentPlace = (ctx: Context<'threads'>): Place => {
  const path = ctx.threads.cwd()
  const device = ctx.threads.device()
  const project = ctx.threads.current()?.info.project
  if (!project && isQuick(ctx, path, device)) return quickPlace(device)
  const group = findGroup(ctx, path, device, project)
  if (!group && isQuick(ctx, path, device)) return quickPlace(device)
  return { id: group?.id ?? `${device ?? ''}\0${path}`, name: group?.name || folderName(path), path, device, updated: group?.updated ?? 0, group }
}

export const places = (ctx: Context<'threads'>): Place[] => {
  if (!ctx.projects) return [currentPlace(ctx)].filter(place => place.path)
  const device = ctx.threads.device()
  const here = currentPlace(ctx).id
  return ctx.projects
    .groups()
    .flatMap(group => groupPlace(ctx, group, device) ?? [])
    .sort((a, b) => Number(b.id === here) - Number(a.id === here) || Number(a.away ?? false) - Number(b.away ?? false) || b.updated - a.updated)
}

export const machineName = (ctx: Context, device?: string) => (device ? (ctx.machines?.get(device)?.name ?? 'Other PC') : undefined)

export const pcName = (ctx: Context, device?: string) => machineName(ctx, device) ?? ctx.machines?.get()?.name ?? 'Local'

export const pcNames = (ctx: Context, place: Place) => [...new Set((place.group?.locations ?? [place]).map(location => pcName(ctx, location.device)))]

export const shortPath = (ctx: Context, path: string, device?: string) => {
  const home = ctx.projects?.place(device).home
  return home && home !== '~' && path.startsWith(home) ? `~${path.slice(home.length)}` : path
}
