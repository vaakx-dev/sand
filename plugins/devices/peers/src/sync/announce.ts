import { kindOfUrl, originOf } from '@sand/devices-connect'
import { isPcUnavailable, type Network, type Peers, peersAnnounce, type PublishedRoute } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import type { Dispose } from 'drydock'

export const routeAnnouncer = (peers: Peers, network: () => Network | undefined) => {
  const advertised = new Map<string, PublishedRoute[]>()

  const send = (pc: string) => {
    const routes = [...(network()?.state().routes ?? []), ...(advertised.get(pc) ?? [])]
    peers.call(pc, peersAnnounce, { routes }).catch((error: unknown) => {
      if (!isPcUnavailable(error)) console.error(`couldn't tell ${peers.get(pc)?.name ?? pc} how to reach this PC: ${errorMessage(error)}`)
    })
  }

  const tell = (pc: string) => {
    if (network() || advertised.has(pc)) send(pc)
  }

  const setAdvertised = (pc: string, routes: PublishedRoute[]) => {
    if (routes.length) advertised.set(pc, routes)
    else advertised.delete(pc)
    if (peers.connected().includes(pc)) send(pc)
  }

  return {
    tell,
    tellAll: () => peers.connected().forEach(tell),
    advertise(pc: string, url: string): Dispose {
      const origin = originOf(url)
      if (!origin) throw new Error(`${url} isn't an http or https address`)
      const route: PublishedRoute = { url: origin, kind: kindOfUrl(origin) }
      setAdvertised(pc, [...(advertised.get(pc) ?? []), route])
      return () => setAdvertised(pc, advertised.get(pc)?.filter(known => known !== route) ?? [])
    },
  }
}
