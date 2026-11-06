import type { OrchestratorContext } from '../context'
import type { Orchestrator } from '../contract'
import type { Start } from '../start'
import { group } from './group'
import { listTool } from './list'
import { readTool } from './read'
import { sendTool } from './send'
import { startTool } from './start'
import { waitTool } from './wait'

export const threadTools = (ctx: OrchestratorContext, start: Start, threads: Orchestrator) => {
  ctx.effect(() => ctx.tools.group({ name: group, label: 'Threads', summary: 'start, message, wait for, read and list other threads', load: 'on-demand' }))
  for (const tool of [startTool(ctx, start), sendTool(ctx, threads), waitTool(threads), readTool(ctx), listTool(ctx)]) ctx.effect(() => ctx.tools.register(tool))
}
