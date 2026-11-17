import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { helloScripts, scriptUpdate, scriptUpdateWire } from './contract'
import { createRuns } from './runs'
import { scriptTool } from './tool'

export default definePlugin({
  name: 'scripts',
  description: 'The script tool: one program makes many tool calls',
  inject: { tools },
  apply(ctx) {
    const runs = createRuns(update => ctx.emit(scriptUpdate, update))
    ctx.effect(() => ctx.tools.register(scriptTool(ctx.tools, runs)))
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.hello(helloScripts, runs.list),
            ctx.on(scriptUpdate, update => found.broadcast(scriptUpdateWire, update)),
          )
        : undefined,
    )
  },
})
