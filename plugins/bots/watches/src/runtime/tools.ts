import type { McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { kindsChange } from '@sand/watches/contract'
import { createTool, group, listTool, removeTool } from '../tools'
import type { BotWatchesContext } from './context'

export const offerTools = (ctx: BotWatchesContext, found: McpTools) => {
  const offerCreate = () => {
    const tool = createTool(ctx.watches.kinds())
    return tool ? found.register(tool) : () => {}
  }
  let create = offerCreate()
  const stop = ctx.on(kindsChange, () => {
    create()
    create = offerCreate()
  })
  return joinDisposers(stop, () => create(), found.group(group), found.register(listTool), found.register(removeTool))
}
