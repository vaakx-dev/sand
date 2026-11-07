import type { McpGroup, McpTool, McpToolContext, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers, timestamp } from '@sand/util'
import type { Kind } from '@sand/watches/contract'
import { z } from 'zod'
import { type BotWatch, botWatchCreate, botWatchKinds, botWatchList, botWatchRemove } from './contract'

export const group: McpGroup = { name: 'watches', label: 'Watches', summary: 'wake a bot only when something it follows changes, and list or remove what it listens to' }

const fields = z.object({
  bot: z.string().optional().describe('The bot to wake (default: you, when you are a bot)'),
  label: z.string().trim().min(1).max(60).describe('A short name the user sees, like "Release notes"'),
  instructions: z
    .string()
    .trim()
    .min(1)
    .describe('What to do when it changes, written to the bot\'s future self, like "Read the new release notes and tell the user if anything breaks their build"'),
})

const createDescription =
  "Wake a bot when something changes. A cheap watcher keeps an eye on it for free, and the bot gets a turn only when it changes, with what changed and these instructions. Use this instead of checking on a schedule. Returns the watch, with any info it needs, like a webhook's URL."

const listInput = z.object({ bot: z.string().optional().describe("Only this bot's watches (default: yours, when you are a bot; else every bot's)") })
const removeInput = z.object({ id: z.string().describe('The watch id from watch_list') })
const kindsInput = z.object({})

type WatchInput = Record<string, unknown>

type Given = z.output<typeof fields> & { watch: WatchInput }

const shown = ({ created, changed, ...watch }: BotWatch) => ({ ...watch, ...(changed !== undefined && { changed: timestamp(changed) }) })

const create = async ({ watch: { kind, ...input }, ...rest }: Given, { call }: McpToolContext) => shown(await call(botWatchCreate, { ...rest, kind: String(kind), input }))

const watchCreate = (watch: z.ZodType<WatchInput>): McpTool => {
  const input = fields.extend({ watch })
  return { name: 'watch_create', description: createDescription, input, access: 'operate', group: group.name, run: create } satisfies McpTool<typeof input>
}

const unionOf = (kinds: Kind[]) => {
  const [first, ...rest] = kinds.map(kind => kind.input.extend({ kind: z.literal(kind.name) }).describe(`${kind.label}: ${kind.description}`))
  return first && z.discriminatedUnion('kind', [first, ...rest]).describe('What to watch')
}

export const createTool = (kinds: Kind[]) => {
  const watch = unionOf(kinds)
  return watch && watchCreate(watch)
}

export const listTool: McpTool = {
  name: 'watch_list',
  description: "List what a bot listens to: each watch's label, kind, target, info like a webhook's URL, when it last changed, and any error",
  input: listInput,
  access: 'read',
  group: group.name,
  run: async (input, { call }) => (await call(botWatchList, input)).map(shown),
} satisfies McpTool<typeof listInput>

export const removeTool: McpTool = {
  name: 'watch_remove',
  description: 'Stop a watch for good, so its bot is no longer woken by it',
  input: removeInput,
  access: 'operate',
  group: group.name,
  run: ({ id }, { call }) => call(botWatchRemove, { watch: id }),
} satisfies McpTool<typeof removeInput>

const kindsTool: McpTool = {
  name: 'watch_kinds',
  description: 'List the kinds of things a watch can follow, with the fields watch_create takes for each',
  input: kindsInput,
  access: 'read',
  group: group.name,
  run: (_, { call }) => call(botWatchKinds, {}),
} satisfies McpTool<typeof kindsInput>

const anyKind = z.looseObject({ kind: z.string().describe('The kind, from watch_kinds') }).describe('What to watch: its kind and the fields watch_kinds lists for it')

export const offerOutsideTools = (found: McpTools) =>
  joinDisposers(found.group(group), ...[listTool, removeTool, kindsTool, watchCreate(anyKind)].map(tool => found.register(tool)))
