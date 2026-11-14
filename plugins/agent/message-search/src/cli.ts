import { cliCommands } from '@sand/cli-commands/contract'
import type { CliValues } from '@sand/config/contract'
import { daemon } from '@sand/host-daemon/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { exactTime } from '@sand/util'
import { definePlugin } from 'drydock'
import { type ChatHits, type Found, messagesSearch, mostHits } from './contract'
import { indexingNote, offerSearchTool } from './tools'

interface Asked {
  query: string
  limit?: number
}

const usage = [
  'sand search <words…>               find the chats where words were said, best matches first',
  `sand search <words…> --limit <n>   at most n chats, up to ${mostHits} (default 20)`,
  'sand search <words…> --json        print the chats as JSON',
].join('\n')

const limitOf = (value: string | boolean | undefined) => {
  if (typeof value !== 'string') return undefined
  const limit = Number(value)
  return Number.isInteger(limit) && limit >= 1 && limit <= mostHits ? limit : null
}

const askedOf = (args: string[], values: CliValues): Asked | undefined => {
  const query = args.join(' ').trim()
  const limit = limitOf(values.limit)
  if (!query || limit === null) return undefined
  return { query, ...(limit && { limit }) }
}

const matchesText = (matches: number) => (matches === 1 ? '1 match' : `${matches} matches`)

const chatLines = ({ owner, chat, title, at, matches, hits }: ChatHits) => [
  `${title || 'Untitled'} · ${exactTime(at)} · ${matchesText(matches)} · ${owner} ${chat}`,
  ...hits.map(hit => `  ${hit.excerpt.text}`),
]

const print = ({ chats, indexing }: Found) => {
  console.log(chats.length ? chats.flatMap(chatLines).join('\n') : 'No messages found')
  if (indexing) console.error(indexingNote(indexing))
}

export default definePlugin({
  name: 'message-search-cli',
  description: 'The sand search command, and message search for outside agents over MCP',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.watch(mcpTools, found => found && offerSearchTool(found))
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'search',
        summary: 'find messages said in your threads and bots',
        usage,
        options: {
          json: { type: 'boolean', help: 'sand search: print the chats as JSON' },
          limit: { type: 'string', help: 'sand search: at most this many chats' },
        },
        async run(args, values) {
          const asked = askedOf(args, values)
          if (!asked) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const link = await ctx.daemon.link()
          try {
            const found = await link.call(messagesSearch, asked)
            if (values.json) console.log(JSON.stringify(found))
            else print(found)
            return 0
          } finally {
            link.close()
          }
        },
      }),
    )
  },
})
