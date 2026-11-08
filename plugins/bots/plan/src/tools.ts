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

const readRules = `Read your plan: the Markdown file of your work that the user reads to see where things stand. It's empty until you write one. The user can edit it too, so read it before you change it. A bot leaves out bot to read its own.`

const writeRules = `Write your plan, replacing the whole file. The plan is what the user reads to see where your work stands, so keep it current: update it when you start work, finish it, or wait on someone or something. Drop items that are done and no longer matter. A bot leaves out bot to write its own.

Write one bullet per item. Link each item that has a thread to it as [title](${threadScheme}:<thread id>), with a short note after it. Don't sort items under status headings like Working, Ready or Done: the Project page groups linked items by each thread's live state. An item with no thread yet stays plain, with what it waits on:

- [Fix the login bug](${threadScheme}:0b6c2e1a): tests running
- [Lisbon flight options](${threadScheme}:7f3d9a40): for you to pick one
- Hotel quote: asked the hotel, reply due Friday
- Book the airport transfer once the flights are picked`

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
