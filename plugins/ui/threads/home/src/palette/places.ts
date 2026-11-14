import { pcs } from '@sand/devices-contract'
import type { ProjectEntry, ProjectGroup, ProjectShown } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { StartParts } from '../launch/start'

export interface Place {
  id: string
  shown: ProjectShown
  path: string
  device: string
  updated: number
  group: ProjectGroup
  away?: boolean
}

const isOnline = (ctx: Context, device: string) => ctx.get(pcs)?.online(device) ?? true

const usable = (ctx: Context, location: ProjectEntry) => !location.missing && isOnline(ctx, location.device)

export const otherLocations = (ctx: Context, group: ProjectGroup, device: string) =>
  group.locations
    .filter(location => location.device !== device && usable(ctx, location))
    .filter((location, index, all) => all.findIndex(other => other.device === location.device) === index)

const groupPlace = ({ ctx, projects }: StartParts, group: ProjectGroup, device: string): Place | undefined => {
  const here = group.locations.find(location => location.device === device && !location.missing)
  const location = here ?? group.locations.find(location => usable(ctx, location))
  if (!location) return undefined
  return {
    id: group.id,
    shown: projects.shown({ path: location.path, device: location.device, project: group.id }),
    path: location.path,
    device: location.device,
    updated: group.updated,
    group,
    away: !here,
  }
}

const currentProject = ({ threads, projects }: StartParts) => {
  const current = threads.current()
  if (!current || current.info.kind === 'quick') return undefined
  return current.info.project ?? projects.group(current.info.cwd, current.device)?.id
}

export const places = (parts: StartParts, groups: ProjectGroup[]): Place[] => {
  const device = parts.threads.device()
  const here = currentProject(parts)
  return groups
    .flatMap(group => groupPlace(parts, group, device) ?? [])
    .sort(
      (a, b) =>
        Number(b.group.pinned) - Number(a.group.pinned) ||
        Number(b.id === here) - Number(a.id === here) ||
        Number(a.away ?? false) - Number(b.away ?? false) ||
        b.updated - a.updated,
    )
}

export const awayPcName = (ctx: Context, device: string) => {
  const pc = ctx.get(pcs)?.get(device)
  return pc && !pc.home ? pc.name : undefined
}

export const pcName = (ctx: Context, device: string) => ctx.get(pcs)?.name(device) ?? 'This PC'

export const pcNames = (ctx: Context, place: Place) => [...new Set(place.group.locations.map(location => pcName(ctx, location.device)))]
