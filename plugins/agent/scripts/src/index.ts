import { toolContent } from '@sand/engine/contract'
import { logins } from '@sand/logins/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { helloScripts, scriptUpdate, scriptUpdateWire } from './contract'
import { createRuns } from './runs'
import { scriptTool } from './tool'

const BASICS = ['read', 'edit', 'shell', 'agent']

export default definePlugin({
  name: 'scripts',
  description: 'The script tool: one program makes many tool calls',
  inject: { tools },
  apply(ctx) {
    const runs = createRuns(update => ctx.emit(scriptUpdate, update))
    const tool = scriptTool({
      tools: ctx.tools,
      runs,
      content: (content, conversation) => ctx.waterfall(toolContent, content, conversation),
      logins: () => ctx.get(logins),
    })
    ctx.effect(() => joinDisposers(ctx.tools.register(tool), ctx.tools.funnel({ tool: tool.name, basics: BASICS })))
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
