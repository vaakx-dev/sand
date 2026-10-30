import type { Peers } from '@sand/devices-contract'
import type { PeerLink } from '../types'

export const createLink = (peers: Peers): PeerLink => ({
  list: () => peers.list().map(({ id, name }) => ({ id, name })),
  call: (pc, request, input, timeout) => peers.call(pc.id, request, input, { timeout }),
})
