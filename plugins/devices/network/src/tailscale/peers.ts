import type { TailscalePeer } from '@sand/devices-contract'
import { dnsName, ipv4Of, readStatus, type StatusNode } from './status'

const peerOf = (node: StatusNode | undefined): TailscalePeer[] => {
  const ip = ipv4Of(node)
  const name = dnsName(node) ?? node?.HostName
  return ip && name ? [{ name, ip, online: node?.Online === true }] : []
}

export const readPeers = async (binary: string | undefined): Promise<TailscalePeer[]> => {
  if (!binary) return []
  const read = await readStatus(binary)
  if (!read.ok || read.status.BackendState !== 'Running') return []
  return Object.values(read.status.Peer ?? {}).flatMap(peerOf)
}
