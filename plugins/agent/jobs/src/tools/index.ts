import type { JobsContext } from '../context'
import type { Delivery } from '../deliver'
import type { Store } from '../store'
import { group } from './line'
import { listTool } from './list'
import { readTool } from './read'
import { stopTool } from './stop'
import { waitTool } from './wait'

export const jobTools = (ctx: JobsContext, store: Store, delivery: Delivery) => {
  ctx.effect(() =>
    ctx.tools.group({
      name: group,
      label: 'Background jobs',
      summary: 'list, read, wait for and stop your background commands',
      load: 'on-demand',
    }),
  )
  const started = Date.now()
  for (const tool of [listTool(ctx.sessions, store, started), readTool(store), waitTool(ctx, store, delivery), stopTool(store)]) {
    ctx.effect(() => ctx.tools.register(tool))
  }
}
