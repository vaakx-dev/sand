import { isPcUnavailable, type Network, type Peers, peersAnnounce } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'

export const routeAnnouncer = (peers: Peers, network: () => Network | undefined) => {
  const tell = (pc: string) => {
    const found = network()
    if (!found) return
    peers.call(pc, peersAnnounce, { routes: found.state().routes }).catch((error: unknown) => {
      if (!isPcUnavailable(error)) console.error(`couldn't tell ${peers.get(pc)?.name ?? pc} how to reach this PC: ${errorMessage(error)}`)
    })
  }

  return {
    tell,
    tellAll: () => peers.connected().forEach(tell),
  }
}
