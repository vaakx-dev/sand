import { machines, machinesChange, wireHello, wireState } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { Context } from 'drydock'
import type { Pc } from './data/types'

export const pcList = (ctx: Context<{ machines: typeof machines }>) => {
  const changes = pulse(ctx, [machinesChange, wireHello, wireState], [machines])
  return (): Pc[] => {
    changes.version.get()
    return ctx.machines.list().map(({ id, name, local, online }) => ({ id, name, local, online }))
  }
}
