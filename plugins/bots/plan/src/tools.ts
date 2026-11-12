import { threadScheme } from '@sand/chat/contract'
import type { McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { planLimit, planRead, planWrite } from './contract'

const bot = z.string().optional().describe('The bot id (default: you, when you are a bot)')

const readInput = z.object({ bot })

const writeInput = z.object({
  bot,
  text: z.string().max(planLimit).describe(`The whole plan in Markdown, replacing the one there; at most ${planLimit.toLocaleString('en')} characters`),
})

const readRules = `Read your plan: the Markdown file the user reads to see where your work stands. It's empty until you write one. The user can edit it, so read it before you change it. A bot leaves out bot to read its own.`

const writeRules = `Write your plan, replacing the whole file. Keep it current: update it when you start or finish work, or wait on someone or something, and drop done items that no longer matter. A bot leaves out bot to write its own.

One bullet per item. Link an item that has a thread as [title](${threadScheme}:<thread id>) with a short note; each link shows its thread's live state, so don't add status headings. An item with no thread stays plain, with what it waits on:

- [Fix the login bug](${threadScheme}:0b6c2e1a): tests running
- Hotel quote: asked the hotel, reply due Friday`

export const planTools: McpTool[] = [
  {
    name: 'bot_plan_read',
    description: readRules,
    input: readInput,
    access: 'read',
    agents: ['bot'],
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
