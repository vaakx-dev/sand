import type { TailscalePeer } from '@sand/devices-contract'
import { urlFor } from '../routes/hosts'
import type { Found } from './found'
import { probeIdentity } from './probe'

const probeTimeout = 3_000

const probePeer = async (peer: TailscalePeer, port: number): Promise<Found[]> => {
  const url = urlFor(peer.ip, port)
  const identity = await probeIdentity(url, probeTimeout)
  return identity ? [{ identity, url, via: 'tailscale', seen: Date.now() }] : []
}

export const findOnTailnet = async (peers: TailscalePeer[], port: number) =>
  (await Promise.all(peers.filter(peer => peer.online).map(peer => probePeer(peer, port)))).flat()
