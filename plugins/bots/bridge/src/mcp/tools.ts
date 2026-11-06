import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { awaitBot, botAsk, botRead, botRoster, readLimit } from '../contract'

const waitSeconds = 300
const mostWaitSeconds = 3600

const bot = z.string().describe('The bot id')

const sendInput = z.object({
  bot,
  prompt: z.string().min(1).describe('The task or question, with what the bot needs to know'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Stop waiting after this long (default ${waitSeconds}) and get the turn as a handle; the bot keeps working`),
  clientRequestId: z.string().min(1).optional().describe('Any unique string; calling again with the same id returns the first result instead of asking twice'),
})

const listInput = z.object({})

const readInput = z.object({
  bot,
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first; leave it out for the latest items'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
})

export const botMcpTools: McpTool[] = [
  {
    name: 'bot_list',
    description: "List the user's sand bots with each one's job and whether it is working",
    input: listInput,
    access: 'read',
    run: (_, { call }) => call(botRoster, {}),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'bot_send',
    description: "Hand one of the user's sand bots a task or question and wait for its reply; when it takes longer you get its turn as a handle, and bot_read shows the reply later",
    input: sendInput,
    access: 'operate',
    run: async ({ bot, prompt, timeoutSeconds = waitSeconds, clientRequestId = Bun.randomUUIDv7() }, { call }) =>
      awaitBot(call, await call(botAsk, { bot, prompt, origin: 'mcp', clientRequestId }), Date.now() + timeoutSeconds * 1000),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'bot_read',
    description: "Read a sand bot's conversation; each item has a seq to read on from and the turn it belongs to",
    input: readInput,
    access: 'read',
    run: (input, { call }) => call(botRead, input),
  } satisfies McpTool<typeof readInput>,
]
