import { type Feature, type FeatureChoice, featuresList, featuresSet } from '@sand/features/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { runtimesSwapped } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import { reloadNote } from './reloaded'
import { z } from 'zod'

const group: McpGroup = {
  name: 'addons',
  label: 'sand add-ons',
  summary: "list sand's add-ons, like coding, the terminal, calendar or computer use, and turn one on when the user asks for something it does",
}

const listed = ({ id, label, summary, parent, needs, on }: Feature) => ({ id, label, summary, ...(parent && { parent }), ...(needs.length && { needs }), on })

const addons = ({ features }: FeatureChoice) => features.filter(feature => feature.kind === 'feature').map(listed)

const listInput = z.object({})

const listTool: McpTool<typeof listInput> = {
  name: 'addon_list',
  description:
    "List sand's add-ons and other features with whether each is on. An add-on whose parent or needs are off stays off until they are on. When the user asks for something sand can't do yet, look here for an add-on that does it",
  input: listInput,
  access: 'read',
  group: group.name,
  run: async (input, { call }) => addons(await call(featuresList, input)),
}

const setInput = z.object({ changes: z.record(z.string(), z.boolean()).describe('Feature ids from addon_list, true to turn on and false to turn off') })

const setTool: McpTool<typeof setInput> = {
  name: 'addon_set',
  description:
    "Turn add-ons and other features on or off, as the user asked. sand then reloads its plugins into a fresh runtime and returns once it is up, naming any plugin that failed to load. After this batch of tool calls your turn moves there and carries on with the new tools, so go on and use them in this turn. Tell the user what you turned on",
  input: setInput,
  access: 'operate',
  group: group.name,
  async run(input, { call }) {
    const choice = await call(featuresSet, input)
    const swap = await call(runtimesSwapped, {})
    return { addons: addons(choice), ...(swap && { reload: reloadNote(swap) }) }
  },
}

const offerAddonTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(setTool))

export { listTool, offerAddonTools, setTool }
