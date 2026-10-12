import type { Context } from 'drydock'
import type { Delivery } from '../deliver'
import type { Store } from '../store'
import { group } from './line'
import { listTool } from './list'
import { readTool } from './read'
import { sendTool } from './send'
import { stopTool } from './stop'
import { waitTool } from './wait'

export const jobTools = (ctx: Context<'sessions' | 'tools'>, store: Store, delivery: Delivery) => {
  ctx.effect(() =>
    ctx.tools.group({
      name: group,
      label: 'Background jobs',
      summary: 'list, read, message, wait for and stop your background agents, workflows and shell commands',
      load: 'on-demand',
    }),
  )
  const started = Date.now()
  for (const tool of [listTool(ctx, store, started), readTool(store), sendTool(store), waitTool(ctx, store, delivery), stopTool(store)]) {
    ctx.effect(() => ctx.tools.register(tool))
  }
}
