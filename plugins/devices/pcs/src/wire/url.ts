import { PcUnavailable, viaPath } from '@sand/devices-contract'
import type { Fleet } from '../fleet/fleet'
import { appProxyOrigin } from '../page/app'

const routeTo = (fleet: Fleet, pc: string) => {
  const status = fleet.connection(pc).status()
  if (status.phase !== 'connected') throw new PcUnavailable({ pc, name: fleet.nameOf(pc), status, reason: 'disconnected' })
  return status.route
}

const directBase = (fleet: Fleet, pc: string) => (pc === fleet.home ? appProxyOrigin() : undefined) ?? routeTo(fleet, pc).url

export const pcUrl = (fleet: Fleet, path: string, pc: string) => {
  const direct = directBase(fleet, pc)
  if (direct) return new URL(path, direct).href
  const { via } = routeTo(fleet, pc)
  if (!via) throw new Error(`${fleet.nameOf(pc)} has no route this page can link to`)
  const relay = directBase(fleet, via)
  if (!relay) throw new Error(`${fleet.nameOf(via)} isn't connected to this page directly`)
  return new URL(viaPath(pc, path), relay).href
}
