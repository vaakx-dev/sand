import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerPlanTools } from './tools'

export default definePlugin({
  name: 'bot-plan-tools',
  description: "Offers the tools that read and write each bot's plan to outside agents over MCP",
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerPlanTools(found))
  },
})
