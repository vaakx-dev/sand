import { filesInput, promptWithFiles } from '@sand/attachments/contract'
import { awaitBot, botInterrupt, botSend } from '@sand/bot-turns/contract'
import { botCreate, botDelete, botList, botUpdate, jobLimit } from '@sand/bots/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { rowOf } from './row'

const group: McpGroup = { name: 'bots', label: 'Bots', summary: "list, make and delete the user's bots, hand one a task, stop its turn and change its job or limits" }

const waitSeconds = 300
const mostWaitSeconds = 3600

const bot = z.string().describe('The bot id')

const sendInput = z.object({
  bot,
  prompt: z.string().min(1).describe('The task or question, with what the bot needs to know'),
  files: filesInput(),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Outside sand only: stop waiting after this long (default ${waitSeconds}) and get the turn as a handle; the bot keeps working`),
  clientRequestId: z.string().min(1).optional().describe('Any unique string; calling again with the same id returns the first result instead of asking twice'),
})

const listInput = z.object({})

const self = z.string().optional().describe('The bot id (default: you, when you are a bot)')

const profile = z.object({
  name: z.string().min(1).max(60).optional().describe('Its name'),
  job: z.string().min(1).max(jobLimit).optional().describe(`Its whole job, replacing any it has; at most ${jobLimit.toLocaleString('en')} characters`),
  projects: z.array(z.string().min(1)).optional().describe('Every project it manages, from project_list, replacing any it has; [] for none'),
  budget: z.number().positive().max(1_000_000).nullable().optional().describe('Its spend limit per calendar month in US dollars, or null for none'),
})

const createInput = profile

const updateInput = profile.extend({ bot: self, paused: z.boolean().optional().describe('Pause it, or resume it with false') })

const oneInput = z.object({ bot })

const updateRules = `Rename a bot, write its job, set the projects it manages, pause or resume it, or set its monthly spend limit; returns the bot as bot_list shows it. A bot leaves out bot to update itself.

A paused bot starts no turns: its running turn stops, and its messages, routines and watches wait until it is resumed. A bot whose API spend this month reaches its limit is held the same way until next month or a higher limit; subscription usage doesn't count.

A job is a bot's standing instructions, written to it in the second person ("You keep the user's calendar and plan their days."): what it takes care of, when to check with the user before acting, and how to reply. Keep it to a line and a few bullets. Facts about the user, like names, places and preferences, go in its memory instead. Every change shows in the bot's chat with who made it, and the user can edit or undo a new job there.`

export const botTools: McpTool[] = [
  {
    name: 'bot_list',
    description: "List the user's bots with each one's job, whether it is working or held (paused, or at its monthly limit), the projects it manages, its monthly spend limit in US dollars and what it spent this month",
    input: listInput,
    access: 'read',
    group: group.name,
    run: async (_, { call }) => (await call(botList, {})).map(rowOf),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'bot_send',
    description: "Hand one of the user's bots a task or question. From sand's own threads and bots it returns at once and the bot's final reply comes to you as a <task-notification>; don't wait or poll for it. From outside sand it returns the reply, or the turn as a handle once timeoutSeconds passes; then read the reply later with history_read",
    input: sendInput,
    access: 'operate',
    group: group.name,
    run: async ({ bot, prompt, files, timeoutSeconds = waitSeconds, clientRequestId = Bun.randomUUIDv7() }, { call, signal, here }) =>
      awaitBot(call, await call(botSend, { bot, prompt: await promptWithFiles(call, prompt, files, here), origin: 'mcp', clientRequestId }), Date.now() + timeoutSeconds * 1000, signal),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'bot_create',
    description: `Make a new bot with a name, a job, the projects it manages and a monthly spend limit; returns it as bot_list shows it. Write its job as bot_update describes.`,
    input: createInput,
    access: 'operate',
    group: group.name,
    run: async (input, { call }) => rowOf(await call(botCreate, input)),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'bot_delete',
    description: 'Delete a bot for good, with its chat, memory, plan, routines and watches',
    input: oneInput,
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(botDelete, input),
  } satisfies McpTool<typeof oneInput>,
  {
    name: 'bot_interrupt',
    description: "Stop a bot's running turn",
    input: oneInput,
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(botInterrupt, input),
  } satisfies McpTool<typeof oneInput>,
  {
    name: 'bot_update',
    description: updateRules,
    input: updateInput,
    access: 'operate',
    group: group.name,
    always: ['bot'],
    run: async ({ bot, ...patch }, { call }) => rowOf(await call(botUpdate, { bot, patch })),
  } satisfies McpTool<typeof updateInput>,
]

export const offerBotTools = (found: McpTools) => joinDisposers(found.group(group), ...botTools.map(tool => found.register(tool)))
