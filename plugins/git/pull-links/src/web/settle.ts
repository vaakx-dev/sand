import { pcHello, type Pcs, type Wire } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { autoSettleChange, autoSettleSet, helloAutoSettle } from '../contract'

/** Each PC keeps its own auto-settle switch; the page shows it on when every PC that answered has it on, and sets it on all online PCs. */
export const settleSwitch = (ctx: Context, wire: Wire, pcs: Pcs) => {
  const values = sig<ReadonlyMap<string, boolean>>(new Map())

  const note = (device: string, on: boolean | undefined) => {
    if (on !== undefined && values.get().get(device) !== on) values.update(current => new Map(current).set(device, on))
  }
  const read = (device: string) => note(device, wire.hello(helloAutoSettle, device))

  for (const pc of pcs.list()) if (pc.online) read(pc.id)
  ctx.on(pcHello, read)
  ctx.effect(() => wire.on(autoSettleChange, (on, device) => note(device, on), { from: 'all' }))

  return {
    on: () => [...values.get()].every(([device, on]) => on || !pcs.get(device)),
    async set(on: boolean) {
      const online = pcs.list().filter(pc => pc.online)
      const results = await Promise.allSettled(online.map(pc => wire.call(autoSettleSet, { on }, pc.id).then(value => note(pc.id, value))))
      const failed = results.find(result => result.status === 'rejected')
      if (failed) throw failed.reason
    },
  }
}
