import type { ProjectGroup } from '@sand/protocol'
import type { Context } from 'drydock'
import { folderName } from '@sand/kit'

export interface Place {
  id: string
  name: string
  path: string
  device?: string
  updated: number
  group?: ProjectGroup
}

const sameDevice = (a?: string, b?: string) => (a || undefined) === (b || undefined)

const isOnline = (ctx: Context, device?: string) => !device || (ctx.machines?.get(device)?.online ?? true)

export const defaultLocation = (ctx: Context, group: ProjectGroup, device?: string) =>
  group.locations.find(location => sameDevice(location.device, device)) ??
  group.locations.find(location => isOnline(ctx, location.device)) ??
  group.locations[0]

const groupPlace = (ctx: Context, group: ProjectGroup, device?: string): Place | undefined => {
  const location = defaultLocation(ctx, group, device)
  return location && { id: group.id, name: group.name || folderName(location.path), path: location.path, device: location.device, updated: group.updated, group }
}

export const currentPlace = (ctx: Context<'threads'>): Place => {
  const path = ctx.threads.cwd()
  const device = ctx.threads.device()
  const group = ctx.projects?.group(path, device)
  return { id: group?.id ?? `${device ?? ''}\0${path}`, name: group?.name || folderName(path), path, device, updated: group?.updated ?? 0, group }
}

export const places = (ctx: Context<'threads'>): Place[] => {
  if (!ctx.projects) return [currentPlace(ctx)]
  const device = ctx.threads.device()
  const here = currentPlace(ctx).id
  return ctx.projects
    .groups()
    .flatMap(group => groupPlace(ctx, group, device) ?? [])
    .sort((a, b) => Number(b.id === here) - Number(a.id === here) || b.updated - a.updated)
}

export const machineName = (ctx: Context, device?: string) => (device ? (ctx.machines?.get(device)?.name ?? 'Other PC') : undefined)

export const pcName = (ctx: Context, device?: string) => machineName(ctx, device) ?? ctx.machines?.get()?.name ?? 'Local'

export const pcNames = (ctx: Context, place: Place) => [...new Set((place.group?.locations ?? [place]).map(location => pcName(ctx, location.device)))]

export const shortPath = (ctx: Context, path: string, device?: string) => {
  const home = ctx.projects?.place(device).home
  return home && home !== '~' && path.startsWith(home) ? `~${path.slice(home.length)}` : path
}
