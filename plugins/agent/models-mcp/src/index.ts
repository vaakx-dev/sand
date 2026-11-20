import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerModelTools } from './tools'

export default definePlugin({
  name: 'models-mcp',
  description: 'Offers the model_list and model_price_set tools to its own threads and bots and to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerModelTools(found))
  },
})
