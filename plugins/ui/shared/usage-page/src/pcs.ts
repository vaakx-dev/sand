import { pulse } from '@sand/dom'
import type { Context } from 'drydock'
import type { Pc } from './data/types'

export const pcList = (ctx: Context<'wire'>) => {
  const changes = pulse(ctx, ['machines.change', 'wire.hello', 'wire.state'], ['machines'])
  return (): Pc[] => {
    changes.version.get()
    const home: Pc = { id: 'local', name: 'This PC', local: true, online: ctx.wire.state() === 'open' }
    return ctx.machines?.list().map(({ id, name, local, online }) => ({ id, name, local, online })) ?? [home]
  }
}
