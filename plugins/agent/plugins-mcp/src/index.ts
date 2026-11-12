import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { offerPluginTools } from './tools'

export default definePlugin({
  name: 'plugins-mcp',
  description: 'Offers the plugin_list and plugin_show tools to its own threads and bots and to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerPluginTools(found))
  },
})
