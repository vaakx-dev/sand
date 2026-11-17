import { modelsPrice } from '@sand/accounts/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { levels, levelSet, levelsGet, modelsList } from '@sand/model/contract'

const group: McpGroup = { name: 'models', label: 'Models', summary: 'list the models you can use, set the model of each level and set the price of a model' }

const listInput = z.object({ thread: z.string().optional().describe('Mark the model this thread uses (default: you, when you are a thread)') })

const dollars = (what: string) => z.number().nonnegative().describe(`US dollars per million ${what}`)

const priceInput = z.object({
  model: z.string().min(1).describe('The model id from model_list, or the model name the Usage page shows'),
  input: dollars('input tokens'),
  output: dollars('output tokens'),
  cache_read: dollars('cached input tokens read (default: the input price)').optional(),
  cache_write: dollars('input tokens written to the cache (default: the input price)').optional(),
})

const levelsInput = z.object({})

const levelSetInput = z.object({
  level: z.enum(levels).describe("bot: a bot's own chat; main: threads and agents doing the main work; sub: routine edits and clear jobs; light: finding things and basic computer use; background: titles, summaries and other small jobs"),
  model: z.string().min(1).nullable().optional().describe('A model id or name from model_list; null clears the level so it uses the next heavier one'),
  effort: z.string().min(1).optional().describe('Its effort level, such as low, medium or high, if its model has effort levels'),
})

const levelsTool: McpTool<typeof levelsInput> = {
  name: 'model_levels',
  description: 'The model and effort the user set for each level. A level left out uses the next heavier one: background, light, sub, main; bot uses main',
  input: levelsInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(levelsGet, input),
}

const levelSetTool: McpTool<typeof levelSetInput> = {
  name: 'model_level_set',
  description: "Set the model or effort of a level when the user asks; saved in sand.toml. Returns every level's choice",
  input: levelSetInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(levelSet, input),
}

const listTool: McpTool<typeof listInput> = {
  name: 'model_list',
  description:
    'List the models you can use, for a new thread or agent or to change a thread: id, label, provider, effort levels, context size in tokens and fast mode. Marks the model the thread uses as current',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(modelsList, input),
}

const priceTool: McpTool<typeof priceInput> = {
  name: 'model_price_set',
  description:
    "Set the price sand counts a model's usage at, for the Usage page and cost figures, when sand has no price for it or the user wants a different one. Look the price up on the provider's pricing page when the user doesn't give it. Saves it in sand.toml under [plugins.accounts.prices] and applies at once, also to past usage",
  input: priceInput,
  access: 'operate',
  group: group.name,
  run: async ({ model, input, output, cache_read = input, cache_write = input }, { call }) => {
    await call(modelsPrice, { model, price: { input, output, cacheRead: cache_read, cacheWrite: cache_write } })
    return `${model} now costs $${input} per million input tokens and $${output} per million output tokens`
  },
}

const offerModelTools = (tools: McpTools) =>
  joinDisposers(tools.group(group), tools.register(listTool), tools.register(levelsTool), tools.register(levelSetTool), tools.register(priceTool))

export { levelSetTool, levelsTool, listTool, offerModelTools, priceTool }
