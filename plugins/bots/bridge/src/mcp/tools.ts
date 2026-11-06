import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { awaitBot, botAsk, botProject, botRead, botRoster, readLimit } from '../contract'

const group: McpGroup = { name: 'bots', label: 'Bots', summary: "list the user's bots, hand one a task, read its replies and set the project it manages" }

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

const projectInput = z.object({
  bot: z.string().optional().describe('The bot id (default: you, when you are a bot)'),
  project: z.string().min(1).nullable().describe('The project id, from project_list, or null for none'),
})

export const botTools: McpTool[] = [
  {
    name: 'bot_list',
    description: "List the user's bots with each one's job, whether it is working and the project it manages",
    input: listInput,
    access: 'read',
    group: group.name,
    run: (_, { call }) => call(botRoster, {}),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'bot_send',
    description: "Hand one of the user's bots a task or question and wait for its reply; when it takes longer you get its turn as a handle, and bot_read shows the reply later",
    input: sendInput,
    access: 'operate',
    group: group.name,
    run: async ({ bot, prompt, timeoutSeconds = waitSeconds, clientRequestId = Bun.randomUUIDv7() }, { call, signal }) =>
      awaitBot(call, await call(botAsk, { bot, prompt, origin: 'mcp', clientRequestId }), Date.now() + timeoutSeconds * 1000, signal),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'bot_read',
    description: "Read a bot's conversation; each item has a seq to read on from and the turn it belongs to",
    input: readInput,
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(botRead, input),
  } satisfies McpTool<typeof readInput>,
  {
    name: 'bot_project',
    description: 'Tie a bot to the project it manages: thread_start starts its threads there when it names no folder or project',
    input: projectInput,
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(botProject, input),
  } satisfies McpTool<typeof projectInput>,
]

export const offerBotTools = (found: McpTools) => joinDisposers(found.group(group), ...botTools.map(tool => found.register(tool)))
