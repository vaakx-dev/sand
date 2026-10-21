import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { toolsChange, toolsChangeWire, toolsChoose, toolsGroups, type Tools } from './contract'

export const serveTools = (ctx: Context, server: Server, tools: Tools) =>
  joinDisposers(
    server.handle(toolsGroups, () => tools.groups()),
    server.handle(toolsChoose, async ({ group, load }) => {
      await tools.choose(group, load)
      return tools.groups()
    }),
    ctx.on(toolsChange, () => server.broadcast(toolsChangeWire, tools.groups())),
  )
