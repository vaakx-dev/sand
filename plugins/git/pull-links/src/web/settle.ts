import { pcHello, type Pcs, type Wire } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { autoSettleChange, autoSettleSet, helloAutoSettle } from '../contract'

export const settleSwitch = (ctx: Context, wire: Wire, pcs: Pcs) => {
  const byPc = sig<ReadonlyMap<string, boolean>>(new Map())

  const note = (device: string, on: boolean | undefined) => {
    if (on !== undefined && byPc.get().get(device) !== on) byPc.update(current => new Map(current).set(device, on))
  }
  const read = (device: string) => note(device, wire.hello(helloAutoSettle, device))

  for (const pc of pcs.list()) if (pc.online) read(pc.id)
  ctx.on(pcHello, read)
  ctx.effect(() => wire.on(autoSettleChange, (on, device) => note(device, on), { from: 'all' }))

  const paired = () => [...byPc.get()].filter(([device]) => pcs.get(device))

  return {
    on: () => paired().every(([, on]) => on),
    async set(on: boolean) {
      const online = pcs.list().filter(pc => pc.online)
      const results = await Promise.allSettled(online.map(pc => wire.call(autoSettleSet, { on }, pc.id).then(value => note(pc.id, value))))
      const failed = results.find(result => result.status === 'rejected')
      if (failed) throw failed.reason
    },
  }
}
