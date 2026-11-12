import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { offerAddonTools } from './addons'
import { offerPluginTools } from './tools'

export default definePlugin({
  name: 'plugins-mcp',
  description: 'Offers the plugin_list, plugin_show, plugin_reload, addon_list and addon_set tools to its own threads and bots and to outside agents over MCP',
  apply(ctx) {
    ctx.watch(mcpTools, found => found && joinDisposers(offerPluginTools(found), offerAddonTools(found)))
  },
})
