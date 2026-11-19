import type { Peers, PeerView, Registry, ThisPc } from '@sand/devices-contract'

const removedAt = ({ status }: PeerView) => (status.phase === 'blocked' && status.reason === 'removed' ? (status.at ?? 0) : 0)

export const leaveWhenRemoved = (peers: Peers, registry: Registry, thisPc: ThisPc) => () =>
  peers.onChange(() => {
    const joined = registry.get(thisPc.id)?.added ?? 0
    if (!peers.list().some(view => removedAt(view) > joined)) return
    const otherPcs = registry.all().filter(record => record.kind === 'pc' && record.id !== thisPc.id)
    void registry.forget(otherPcs.map(record => record.id))
  })
