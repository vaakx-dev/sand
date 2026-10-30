import { isPcUnavailable, pcHello, type PeerView, peersChange, peersList, wire } from '@sand/devices-contract'
import { models } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const pcStatus = (ctx: Context) => {
  const online = sig<Record<string, boolean>>({})
  const threadPc = () => ctx.get(models)?.device()
  const apply = (list: PeerView[]) => online.set(Object.fromEntries(list.map(peer => [peer.id, peer.status.phase === 'connected'])))

  const load = () => {
    const pc = threadPc()
    const found = ctx.get(wire)
    if (!pc || !found) return
    void found.call(peersList, {}, pc).then(apply, error => {
      if (isPcUnavailable(error)) online.set({})
    })
  }

  ctx.watch(wire, found => found?.on(peersChange, (list, pc) => pc === threadPc() && apply(list), { from: 'all' }))
  ctx.on(pcHello, pc => {
    if (pc === threadPc()) load()
  })

  return {
    online: (pc: string): boolean | undefined => online.get()[pc],
    key: () => JSON.stringify(online.get()),
    refresh: load,
  }
}

export type PcStatus = ReturnType<typeof pcStatus>
