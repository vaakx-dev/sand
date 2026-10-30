import { PcUnavailable } from '@sand/devices-contract'
import type { Fleet } from '../fleet/fleet'

export const directUrl = (fleet: Fleet, path: string, pc: string) => {
  const status = fleet.connection(pc).status()
  if (status.phase !== 'connected') throw new PcUnavailable(pc, fleet.nameOf(pc), status)
  if (!status.route.url) throw new Error(`${fleet.nameOf(pc)} is only reachable through another PC, so this page can't link to it directly`)
  return new URL(path, status.route.url).href
}
