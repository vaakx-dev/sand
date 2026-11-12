import { threadScheme } from '@sand/chat/contract'
import type { McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { planLimit, planRead, planWrite } from './contract'

const readInput = z.object({ bot: z.string().describe('The bot id') })

const writeInput = z.object({
  bot: z.string().optional().describe('The bot id (default: you, when you are a bot)'),
  text: z.string().max(planLimit).describe(`The whole plan in Markdown, replacing the one there; at most ${planLimit.toLocaleString('en')} characters`),
})

const readRules = `Read a bot's plan: the Markdown file of what's happening in its work, what's next and what's blocked, which the user reads and can edit. It's empty until the bot writes one. Read it before you change it.`

const writeRules = `Write a bot's plan, replacing the whole file. A bot leaves out bot to write its own, and writes it whenever its work changes: when it starts or finishes something, or starts waiting on someone or something. When an item is done, take it out.

One bullet per item. Link an item that has a thread as [title](${threadScheme}:<thread id>) with a short note; each link shows its thread's live state, so don't add status headings. An item with no thread stays plain, with what it waits on:

- [Fix the login bug](${threadScheme}:0b6c2e1a): tests running
- Hotel quote: asked the hotel, reply due Friday`

export const planTools: McpTool[] = [
  {
    name: 'bot_plan_read',
    description: readRules,
    input: readInput,
    access: 'read',
    agents: [],
    run: (input, { call }) => call(planRead, input),
  } satisfies McpTool<typeof readInput>,
  {
    name: 'bot_plan_write',
    description: writeRules,
    input: writeInput,
    access: 'operate',
    agents: ['bot'],
    run: async (input, { call }) => {
      await call(planWrite, input)
      return 'Saved'
    },
  } satisfies McpTool<typeof writeInput>,
]

export const offerPlanTools = (found: McpTools) => joinDisposers(...planTools.map(tool => found.register(tool)))
