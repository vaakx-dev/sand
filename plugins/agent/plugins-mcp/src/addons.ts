import { type Addon, addonsInstall, addonsRemove, addonsUpdate, type Feature, type FeatureChoice, featuresList, featuresSet } from '@sand/features/contract'
import { runtimesSwapped } from '@sand/host-runtimes/contract'
import type { McpGroup, McpTool, McpToolContext, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { reloadNote } from './reloaded'

const GROUP = 'addons'

const SUMMARY = "list sand's add-ons, which give it abilities it doesn't have yet, install one when the user asks for something it does, and update or remove them"

const groupOf = (ready: Addon[]): McpGroup => ({
  name: GROUP,
  label: 'sand add-ons',
  summary: ready.length ? `${SUMMARY}. Ready to install: ${ready.map(addon => addon.label).join(', ')}` : SUMMARY,
})

const RELOADS =
  'sand then reloads its plugins into a fresh runtime and returns once it is up, naming any plugin that failed to load. After this batch of tool calls your turn moves there and carries on with the new tools, so go on and use them in this turn'

const featureOf = ({ id, label, summary, parent, needs, on }: Feature) => ({ id, label, summary, ...(parent && { parent }), ...(needs.length && { needs }), on })

const overview = ({ features, addons, catalogError }: FeatureChoice) => {
  const on = new Set(features.filter(feature => feature.on).map(feature => feature.id))
  const addonIds = new Set(addons.map(addon => addon.id))
  return {
    addons: addons.map(addon => ({ ...addon, ...(addon.status !== 'available' && { on: on.has(addon.id) }) })),
    features: features.filter(feature => feature.kind === 'feature' && !addonIds.has(feature.id)).map(featureOf),
    ...(catalogError && { catalogError }),
  }
}

const reloaded = async (call: McpToolContext['call'], choice: FeatureChoice) => {
  const swap = await call(runtimesSwapped, {})
  return { ...overview(choice), ...(swap && { reload: reloadNote(swap) }) }
}

const listInput = z.object({})

const listTool: McpTool<typeof listInput> = {
  name: 'addon_list',
  description:
    "List sand's add-ons, installed or available to install, and its other features with whether each is on. An add-on whose parent or needs are off stays off until they are on. When the user asks for something sand can't do yet, look here for an add-on that does it",
  input: listInput,
  access: 'read',
  group: GROUP,
  run: async (input, { call }) => overview(await call(featuresList, input)),
}

const idsInput = z.object({ ids: z.array(z.string().min(1)).min(1).describe('Add-on ids from addon_list') })

const installTool: McpTool<typeof idsInput> = {
  name: 'addon_install',
  description: `Install add-ons from sand's catalog, with the add-ons they need, and turn them on, when the user asks for something they do. ${RELOADS}. Tell the user what you installed`,
  input: idsInput,
  access: 'operate',
  group: GROUP,
  run: async (input, { call }) => reloaded(call, await call(addonsInstall, input)),
}

const updateTool: McpTool<typeof idsInput> = {
  name: 'addon_update',
  description: `Download the newer version of installed add-ons that addon_list shows an update for. ${RELOADS}`,
  input: idsInput,
  access: 'operate',
  group: GROUP,
  run: async (input, { call }) => reloaded(call, await call(addonsUpdate, input)),
}

const removeTool: McpTool<typeof idsInput> = {
  name: 'addon_remove',
  description: `Turn installed add-ons off and delete them, as the user asked. ${RELOADS}`,
  input: idsInput,
  access: 'operate',
  group: GROUP,
  run: async (input, { call }) => reloaded(call, await call(addonsRemove, input)),
}

const setInput = z.object({ changes: z.record(z.string(), z.boolean()).describe('Feature ids from addon_list, true to turn on and false to turn off') })

const setTool: McpTool<typeof setInput> = {
  name: 'addon_set',
  description: `Turn installed add-ons and other features on or off, as the user asked. ${RELOADS}. Tell the user what you turned on`,
  input: setInput,
  access: 'operate',
  group: GROUP,
  run: async (input, { call }) => reloaded(call, await call(featuresSet, input)),
}

const offerAddonTools = (tools: McpTools) =>
  joinDisposers(tools.group(groupOf([])), ...[listTool, installTool, updateTool, removeTool, setTool].map(tool => tools.register(tool)))

const nameReadyAddons = (tools: McpTools, ready: Promise<Addon[]>) => {
  let ungroup: (() => void) | undefined
  let offered = true
  void ready.then(
    found => {
      if (offered) ungroup = tools.group(groupOf(found))
    },
    () => {},
  )
  return () => {
    offered = false
    ungroup?.()
  }
}

export { nameReadyAddons, offerAddonTools }
