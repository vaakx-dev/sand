import { threadScheme } from '@sand/chats/contract'
import type { McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { planEdit, planLimit, planRead, planReplacement } from './contract'

const readInput = z.object({ bot: z.string().describe('The bot id') })

const editInput = z.object({
  bot: z.string().optional().describe('The bot id (default: you, when you are a bot)'),
  edits: z.array(planReplacement).min(1).optional().describe('Changes to the plan, applied in order; all apply or none do'),
  text: z
    .string()
    .optional()
    .describe(`The whole plan in Markdown, replacing the one there, instead of edits; at most ${planLimit.toLocaleString('en')} characters`),
})

const readRules = `Read a bot's plan: the Markdown file of its work, what's next and what's blocked, which the user reads and edits. Read it before you change it.`

const editRules = `Change a bot's plan. A bot leaves out bot to change its own, whenever its work starts, finishes or starts waiting. Give edits to add, change or remove items, so the user's own changes to other items stay: each old_string must match exactly once, and adding an item replaces a nearby line with that line plus the new one. Give text only to start the plan or rewrite all of it. Only work goes in, one bullet per item, never rules or preferences about how it works; take done items out. What it can look up, like PRs, commits and chats, gets a link, not a copy. Link an item that has a thread as [title](${threadScheme}:<thread id>) with a short note and no status; an item with no thread says what it waits on.`

const changeOf = ({ bot, edits, text }: z.infer<typeof editInput>) => {
  if (edits && text !== undefined) throw new Error('Give edits or text, not both')
  if (edits) return { bot, edits }
  if (text !== undefined) return { bot, text }
  throw new Error('Give edits or text')
}

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
    name: 'bot_plan_edit',
    description: editRules,
    input: editInput,
    access: 'operate',
    act: () => ({ effect: 'write', summary: 'Edit its plan' }),
    agents: ['bot'],
    run: async (input, { call }) => {
      await call(planEdit, changeOf(input))
      return 'Saved'
    },
  } satisfies McpTool<typeof editInput>,
]

export const offerPlanTools = (found: McpTools) => joinDisposers(...planTools.map(tool => found.register(tool)))
