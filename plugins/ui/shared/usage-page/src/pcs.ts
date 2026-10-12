import { pulse } from '@sand/kit/web'
import type { Context } from 'drydock'
import type { Pc } from './data/types'

export const pcList = (ctx: Context<'machines'>) => {
  const changes = pulse(ctx, ['machines.change', 'wire.hello', 'wire.state'], ['machines'])
  return (): Pc[] => {
    changes.version.get()
    return ctx.machines.list().map(({ id, name, local, online }) => ({ id, name, local, online }))
  }
}
