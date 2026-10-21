import { folderName } from '@sand/util'
import { machines, projects, type ProjectEntry, type ProjectGroup, type Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { findGroup, quickName } from '../items/lookup'

export interface Place {
  id: string
  name: string
  path: string
  device: string
  updated: number
  group?: ProjectGroup
  away?: boolean
}

const isOnline = (ctx: Context, device: string) => ctx.get(machines)?.online(device) ?? true

const usable = (ctx: Context, location: ProjectEntry) => !location.missing && isOnline(ctx, location.device)

export const otherLocations = (ctx: Context, group: ProjectGroup, device: string) =>
  group.locations
    .filter(location => location.device !== device && usable(ctx, location))
    .filter((location, index, all) => all.findIndex(other => other.device === location.device) === index)

const groupPlace = (ctx: Context, group: ProjectGroup, device: string): Place | undefined => {
  const here = group.locations.find(location => location.device === device && !location.missing)
  const location = here ?? group.locations.find(location => usable(ctx, location))
  if (!location) return undefined
  return {
    id: group.id,
    name: group.name || folderName(location.path),
    path: location.path,
    device: location.device,
    updated: group.updated,
    group,
    away: !here,
  }
}

const quickPlace = (device: string): Place => ({ id: `${device}\0quick`, name: quickName, path: '', device, updated: 0 })

export const currentPlace = (ctx: Context, threads: Threads): Place => {
  const device = threads.device()
  const current = threads.current()
  const path = current?.info.kind === 'quick' ? '' : threads.cwd()
  if (!path) return quickPlace(device)
  const group = findGroup(ctx, path, device, current?.info.project)
  return { id: group?.id ?? `${device}\0${path}`, name: group?.name || folderName(path), path, device, updated: group?.updated ?? 0, group }
}

export const places = (ctx: Context, threads: Threads): Place[] => {
  const found = ctx.get(projects)
  if (!found) return [currentPlace(ctx, threads)].filter(place => place.path)
  const device = threads.device()
  const here = currentPlace(ctx, threads).id
  return found
    .groups()
    .flatMap(group => groupPlace(ctx, group, device) ?? [])
    .sort((a, b) => Number(b.id === here) - Number(a.id === here) || Number(a.away ?? false) - Number(b.away ?? false) || b.updated - a.updated)
}

export const machineName = (ctx: Context, device: string) => {
  const machine = ctx.get(machines)?.get(device)
  return machine && !machine.local ? machine.name : undefined
}

export const pcName = (ctx: Context, device: string) => ctx.get(machines)?.name(device) ?? 'This PC'

export const pcNames = (ctx: Context, place: Place) => [...new Set((place.group?.locations ?? [place]).map(location => pcName(ctx, location.device)))]

export const shortPath = (ctx: Context, path: string, device: string) => {
  const home = ctx.get(projects)?.place(device).home
  return home && home !== '~' && path.startsWith(home) ? `~${path.slice(home.length)}` : path
}
