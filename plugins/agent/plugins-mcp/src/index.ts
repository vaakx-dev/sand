import { addonsReady } from '@sand/features/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { nameReadyAddons, offerAddonTools } from './addons'
import { offerPluginTools } from './tools'

export default definePlugin({
  name: 'plugins-mcp',
  description:
    'Offers the plugin_list, plugin_show, plugin_reload, addon_list, addon_install, addon_update, addon_remove, addon_set, addon_source_add and addon_source_remove tools to its own threads and bots and to outside agents over MCP, naming the add-ons ready to install',
  apply(ctx) {
    ctx.watch(
      mcpTools,
      tools =>
        tools &&
        joinDisposers(
          offerPluginTools(tools),
          offerAddonTools(tools),
          ctx.watch(hostChannel, host => host && nameReadyAddons(tools, host.call(addonsReady, {}))),
        ),
    )
  },
})
