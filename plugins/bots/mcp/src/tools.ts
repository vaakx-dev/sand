import { filesInput, promptWithFiles } from '@sand/attachments/contract'
import { botCreate, botDelete, botList, botUpdate } from '@sand/bots/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { type Sent, threadSend, type ThreadState, threadStop, waitThread } from '@sand/orchestrator/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { rowOf } from './row'

const group: McpGroup = { name: 'bots', label: 'Bots', summary: "list, make and delete the user's bots, hand one a task, stop its turn and change its name, projects or limits" }

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
  projects: z.array(z.string().min(1)).optional().describe('Every project it manages, from project_list, replacing any it has; [] for none'),
  budget: z.number().positive().max(1_000_000).nullable().optional().describe('Its spend limit per calendar month in US dollars, or null for none'),
})

const createInput = profile

const updateInput = profile.extend({ bot: self, paused: z.boolean().optional().describe('Pause it, or resume it with false') })

const oneInput = z.object({ bot })

const asBot = <T extends Sent | ThreadState>({ thread, ...rest }: T) => ({ bot: thread, ...rest })

export const botTools: McpTool[] = [
  {
    name: 'bot_list',
    description: "List the user's bots with their jobs, state, projects, monthly spend limit and spend this month",
    input: listInput,
    access: 'read',
    group: group.name,
    run: async (_, { call }) => (await call(botList, {})).map(rowOf),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'bot_send',
    description: "Send one of the user's bots a message or task. From sand's threads and bots it returns at once and the reply doesn't come back: ask it to message you, or read it later with history_read. From outside sand it waits for the reply",
    input: sendInput,
    access: 'operate',
    group: group.name,
    async run({ bot, prompt, files, timeoutSeconds = waitSeconds, clientRequestId = Bun.randomUUIDv7() }, { call, signal, here, actor }) {
      if (actor?.id === bot) throw new Error("A bot can't message itself")
      const sent = await call(threadSend, { session: bot, prompt: await promptWithFiles(call, prompt, files, here), origin: 'mcp', clientRequestId })
      if (actor) return asBot(sent)
      return asBot(await waitThread(call, bot, 'end', Date.now() + timeoutSeconds * 1000, signal))
    },
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'bot_create',
    description: 'Make a new bot. Give it work with job_create.',
    input: createInput,
    access: 'operate',
    group: group.name,
    run: async (input, { call }) => rowOf(await call(botCreate, input)),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'bot_delete',
    description: 'Delete a bot for good, with its chat, memory, plan and everything it set to run',
    input: oneInput,
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(botDelete, input),
  } satisfies McpTool<typeof oneInput>,
  {
    name: 'bot_interrupt',
    description: "Stop a bot's running turn. Its background commands keep running",
    input: oneInput,
    access: 'operate',
    group: group.name,
    run: ({ bot }, { call }) => call(threadStop, { session: bot }),
  } satisfies McpTool<typeof oneInput>,
  {
    name: 'bot_update',
    description:
      "Rename a bot, set its projects or monthly spend limit, or pause it. A paused bot, or one at its API spend limit, starts no turns; subscription usage doesn't count. A bot leaves out bot to update itself.",
    input: updateInput,
    access: 'operate',
    group: group.name,
    always: ['bot'],
    run: async ({ bot, ...patch }, { call }) => rowOf(await call(botUpdate, { bot, patch })),
  } satisfies McpTool<typeof updateInput>,
]

export const offerBotTools = (found: McpTools) => joinDisposers(found.group(group), ...botTools.map(tool => found.register(tool)))
