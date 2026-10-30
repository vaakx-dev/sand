import { PcUnavailable, viaPath } from '@sand/devices-contract'
import type { Fleet } from '../fleet/fleet'

const routeTo = (fleet: Fleet, pc: string) => {
  const status = fleet.connection(pc).status()
  if (status.phase !== 'connected') throw new PcUnavailable(pc, fleet.nameOf(pc), status)
  return status.route
}

const directBase = (fleet: Fleet, pc: string) => {
  const { url } = routeTo(fleet, pc)
  if (!url) throw new Error(`${fleet.nameOf(pc)} isn't connected to this page directly`)
  return url
}

export const pcUrl = (fleet: Fleet, path: string, pc: string) => {
  const route = routeTo(fleet, pc)
  if (route.url) return new URL(path, route.url).href
  if (!route.via) throw new Error(`${fleet.nameOf(pc)} has no route this page can link to`)
  return new URL(viaPath(pc, path), directBase(fleet, route.via)).href
}
