import type { Peers, Registry, ThisPc } from '@sand/devices-contract'

export const forwardTarget = (registry: Registry, thisPc: ThisPc, peers: Peers) => (pc: string) => {
  const record = registry.get(pc)
  if (!record || record.kind !== 'pc' || record.removed || pc === thisPc.id) throw new Error("That isn't one of your PCs")
  const url = peers.directUrl(pc)
  if (!url) throw new Error(`${record.name} isn't connected to ${thisPc.name()} directly`)
  return url
}
