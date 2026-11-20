import { modelsPrice } from '@sand/accounts/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { modelsList } from '@sand/model/contract'

const group: McpGroup = { name: 'models', label: 'Models', summary: 'list the models you can use and set the price of a model' }

const listInput = z.object({ thread: z.string().optional().describe('Mark the model this thread uses (default: you, when you are a thread)') })

const dollars = (what: string) => z.number().nonnegative().describe(`US dollars per million ${what}`)

const priceInput = z.object({
  model: z.string().min(1).describe('The model id from model_list, or the model name the Usage page shows'),
  input: dollars('input tokens'),
  output: dollars('output tokens'),
  cache_read: dollars('cached input tokens read (default: the input price)').optional(),
  cache_write: dollars('input tokens written to the cache (default: the input price)').optional(),
})

const listTool: McpTool<typeof listInput> = {
  name: 'model_list',
  description:
    'List the models you can use, with their effort levels, context size and fast mode',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(modelsList, input),
}

const priceTool: McpTool<typeof priceInput> = {
  name: 'model_price_set',
  description:
    "Set the price sand counts a model's usage at, also for past usage. Look it up on the provider's pricing page when the user doesn't give it",
  input: priceInput,
  access: 'operate',
  group: group.name,
  run: async ({ model, input, output, cache_read = input, cache_write = input }, { call }) => {
    await call(modelsPrice, { model, price: { input, output, cacheRead: cache_read, cacheWrite: cache_write } })
    return `${model} now costs $${input} per million input tokens and $${output} per million output tokens`
  },
}

const offerModelTools = (tools: McpTools) =>
  joinDisposers(tools.group(group), tools.register(listTool), tools.register(priceTool))

export { listTool, offerModelTools, priceTool }
