import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { modelsList } from '@sand/model/contract'

const group: McpGroup = { name: 'models', label: 'Models', summary: 'list the models you can use' }

const listInput = z.object({ thread: z.string().optional().describe('Mark the model this thread uses (default: you, when you are a thread)') })

const listTool: McpTool<typeof listInput> = {
  name: 'model_list',
  description:
    'List the models you can use, for a new thread or agent or to change a thread: id, label, provider, effort levels, context size in tokens and fast mode. Marks the model the thread uses as current',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(modelsList, input),
}

const offerModelTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool))

export { listTool, offerModelTools }
