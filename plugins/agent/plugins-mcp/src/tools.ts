import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { pluginsReport, pluginsShow } from '@sand/plugins/contract'
import { pluginsReload } from '@sand/reload/contract'
import { joinDisposers } from '@sand/util'
import { reloadNote } from './reloaded'
import { z } from 'zod'

const group: McpGroup = { name: 'plugins', label: 'sand plugins', summary: "inspect sand's plugins and web extensions and their errors, and reload them" }

const listInput = z.object({})

const listTool: McpTool<typeof listInput> = {
  name: 'plugin_list',
  description:
    "List sand's plugins and web extensions with their status and problems. Load the sand-plugins skill before writing a plugin",
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(pluginsReport, input),
}

const showInput = z.object({ name: z.string().min(1).describe('Plugin name, folder name or web extension id') })

const showTool: McpTool<typeof showInput> = {
  name: 'plugin_show',
  description: "Show one of sand's plugins in detail, with its error stack when it failed",
  input: showInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(pluginsShow, input),
}

const reloadInput = z.object({})

const reloadTool: McpTool<typeof reloadInput> = {
  name: 'plugin_reload',
  description:
    'Reload every sand plugin from disk into a fresh runtime. After this batch of tool calls, your turn carries on there with the new tools',
  input: reloadInput,
  access: 'operate',
  group: group.name,
  run: async (input, { call }) => reloadNote(await call(pluginsReload, input)),
}

const offerPluginTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(showTool), tools.register(reloadTool))

export { listTool, offerPluginTools, reloadTool, showTool }
