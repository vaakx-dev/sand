import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { awaitBot, botAsk, botRead, botRoster, botSet, jobLimit, readLimit, readViews } from './contract'

const group: McpGroup = { name: 'bots', label: 'Bots', summary: "list the user's bots, hand one a task and read its replies" }

const waitSeconds = 300
const mostWaitSeconds = 3600

const bot = z.string().describe('The bot id')

const sendInput = z.object({
  bot,
  prompt: z.string().min(1).describe('The task or question, with what the bot needs to know'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Outside sand only: stop waiting after this long (default ${waitSeconds}) and get the turn as a handle; the bot keeps working`),
  clientRequestId: z.string().min(1).optional().describe('Any unique string; calling again with the same id returns the first result instead of asking twice'),
})

const listInput = z.object({})

const self = z.string().optional().describe('The bot id (default: you, when you are a bot)')

const readInput = z.object({
  bot: self,
  query: z.string().min(1).optional().describe('Only items whose text holds this, ignoring case'),
  view: z.enum(readViews).optional().describe('messages (default): what was said, notifications included; activity: tool calls and results too'),
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first'),
  before: z.number().int().min(1).optional().describe('Return the items before this seq; without after, the newest of them'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
})

const updateInput = z.object({
  bot: self,
  name: z.string().min(1).max(60).optional().describe('Rename it'),
  job: z.string().min(1).max(jobLimit).optional().describe(`Its whole job, replacing the one it has; at most ${jobLimit.toLocaleString('en')} characters`),
  project: z.string().min(1).nullable().optional().describe('The project its new threads start in, from project_list, or null for none'),
  paused: z.boolean().optional().describe('Pause it, or resume it with false'),
  budget: z.number().positive().max(1_000_000).nullable().optional().describe('Its spend limit per calendar month in US dollars, or null for none'),
})

const updateRules = `Rename a bot, write its job, set the project it manages, pause or resume it, or set its monthly spend limit; returns the bot as bot_list shows it. A bot leaves out bot to update itself.

A paused bot starts no turns: its running turn stops, and messages, routines and watches for it wait until it is resumed. A bot whose API spend this month reaches its limit is held the same way until next month or a higher limit; usage on a subscription plan doesn't count. A bot can't change its own limit.

A job is the bot's standing instructions. Write it to the bot in the second person ("You keep the user's calendar and plan their days."): what it takes care of, when to check with the user before it acts, and how to reply. Keep it to a line and a few bullets. Leave out facts about the user, like names, places and preferences; those go in its memory. The user sees each new job in the bot's chat and can edit or undo it.

When you are a bot with no job yet:
- If the user hasn't said what they want you for, ask, in one or two short questions at most.
- If their message is a task, do it first, then offer to take on that kind of work as your job.
- Once you know what you're for, write your job, and a name if you have none. After that, change your job only when the user asks.`

export const botTools: McpTool[] = [
  {
    name: 'bot_list',
    description: "List the user's bots with each one's job, whether it is working or held (paused, or at its monthly limit), the project it manages, its monthly spend limit in US dollars and what it spent this month",
    input: listInput,
    access: 'read',
    group: group.name,
    run: (_, { call }) => call(botRoster, {}),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'bot_send',
    description: "Hand one of the user's bots a task or question. From sand's own threads and bots it returns at once and the bot's final reply comes to you as a <task-notification>; don't wait or poll for it. From outside sand it returns the reply, or the turn as a handle once timeoutSeconds passes; then read the reply later with bot_read",
    input: sendInput,
    access: 'operate',
    group: group.name,
    run: async ({ bot, prompt, timeoutSeconds = waitSeconds, clientRequestId = Bun.randomUUIDv7() }, { call, signal }) =>
      awaitBot(call, await call(botAsk, { bot, prompt, origin: 'mcp', clientRequestId }), Date.now() + timeoutSeconds * 1000, signal),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'bot_read',
    description:
      "Read or search a bot's whole conversation, including what compaction took out of its context. Each item has its seq, when it happened and its turn. A bot leaves out bot to look up its own past: what the user said and when, what it did, and the notifications it got. more says there are items past the page: older ones, or newer ones when after is set",
    input: readInput,
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(botRead, input),
  } satisfies McpTool<typeof readInput>,
  {
    name: 'bot_update',
    description: updateRules,
    input: updateInput,
    access: 'operate',
    run: (input, { call }) => call(botSet, input),
  } satisfies McpTool<typeof updateInput>,
]

export const offerBotTools = (found: McpTools) => joinDisposers(found.group(group), ...botTools.map(tool => found.register(tool)))
