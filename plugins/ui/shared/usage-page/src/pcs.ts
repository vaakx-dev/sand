import { pcHello, pcs, pcsChange } from '@sand/devices-contract'
import { pulse } from '@sand/web-client/reactive'
import type { Context } from 'drydock'
import type { Pc } from './data/types'

export const pcList = (ctx: Context<{ pcs: typeof pcs }>) => {
  const changes = pulse(ctx, [pcsChange, pcHello], [pcs])
  return (): Pc[] => {
    changes.version.get()
    return ctx.pcs.list().map(({ id, name, home, online }) => ({ id, name, home, online }))
  }
}
