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

const readRules = `Read a bot's plan: the Markdown file of its work, what's next and what's blocked, which the user reads and edits. Read it before you change it.`

const writeRules = `Replace a bot's whole plan. A bot leaves out bot to write its own, whenever its work starts, finishes or starts waiting. Only work goes in, one bullet per item; take done items out. Link an item that has a thread as [title](${threadScheme}:<thread id>) with a short note and no status; an item with no thread says what it waits on.`

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
    act: () => ({ effect: 'write', summary: 'Update its plan' }),
    agents: ['bot'],
    run: async (input, { call }) => {
      await call(planWrite, input)
      return 'Saved'
    },
  } satisfies McpTool<typeof writeInput>,
]

export const offerPlanTools = (found: McpTools) => joinDisposers(...planTools.map(tool => found.register(tool)))
