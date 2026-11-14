import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { offerJobTools } from './jobs'
import { offerBotTools } from './tools'

export default definePlugin({
  name: 'bots-mcp',
  description: "Offers sand's bot tools to its own threads and bots and to outside agents: list bots, hand them tasks, rename them, set their limits, and set up, change and report their jobs",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && joinDisposers(offerBotTools(found), offerJobTools(found)))
  },
})
