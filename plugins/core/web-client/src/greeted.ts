import { pcHello, type Pcs, type Wire, wireHello } from '@sand/devices-contract'
import type { HelloField } from '@sand/host-hub/contract'
import type { Context } from 'drydock'
import { after } from './detached'

export type HelloRead = <T>(field: HelloField<T>) => T | undefined

export const helloOf =
  (wire: Wire, pc: string): HelloRead =>
  field =>
    wire.hello(field, pc)

const replay = (ctx: Context, run: () => void) => ctx.effect(() => after(0, run))

export const onPcHello = (ctx: Context, wire: Wire, pcs: Pcs, run: (pc: string, retagged: boolean) => void) => {
  ctx.on(pcHello, run)
  const greeted = pcs
    .list()
    .map(pc => pc.id)
    .filter(pc => wire.ready(pc))
  if (greeted.length) replay(ctx, () => greeted.forEach(pc => run(pc, false)))
}

export const onHomeHello = (ctx: Context, wire: Wire, run: () => void) => {
  ctx.on(wireHello, run)
  if (wire.ready()) replay(ctx, run)
}
