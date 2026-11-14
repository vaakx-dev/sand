import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { type Indexing, type MessageHit, messagesSearch, mostHits, queryLimit } from './contract'

const group: McpGroup = { name: 'message-search', label: 'Message search', summary: 'find words said in your threads and bots' }

const searchInput = z.object({
  query: z.string().trim().min(1).max(queryLimit).describe('Words said in the chat; the last one may be the start of a word'),
  owner: z.enum(['thread', 'bot']).optional().describe('Only threads or only bots (default: both)'),
  chat: z.string().min(1).optional().describe('Only this thread or bot, by id'),
  before: z.iso.datetime({ offset: true }).optional().describe('Only messages said before this time, to page back from the oldest hit you got'),
  limit: z.number().int().min(1).max(mostHits).optional().describe('At most this many hits (default 20)'),
})

const description = `Search the words said in every thread and bot chat on this PC, by you and the user, not tool output. Use it to find where something was discussed or decided, or a command, number or name from an earlier chat, when you don't know which thread it was in. Hits come with the words side by side first, then all the words, then words that start with them, newest first within each, at most 3 per chat unless you pick one chat. Each hit has the chat, its time and an excerpt; thread hits link to the thread as thread:<id>.`

const shown = ({ owner, chat, title, role, at, excerpt }: MessageHit) => ({
  owner,
  chat,
  title,
  role,
  at: new Date(at).toISOString(),
  excerpt: excerpt.text,
  ...(owner === 'thread' && { link: `thread:${chat}` }),
})

const indexingNote = ({ done, total }: Indexing) =>
  `The index is still being built, ${Math.floor((done / total) * 100)}% done, so older messages may be missing; search again in a moment`

const searchTool = {
  name: 'message_search',
  description,
  input: searchInput,
  access: 'read',
  group: group.name,
  always: ['bot'],
  run: async ({ before, ...input }, { call }) => {
    const found = await call(messagesSearch, { ...input, ...(before && { before: Date.parse(before) }) })
    return { hits: found.hits.map(shown), ...(found.indexing && { indexing: indexingNote(found.indexing) }) }
  },
} satisfies McpTool<typeof searchInput>

const offerSearchTool = (found: McpTools) => joinDisposers(found.group(group), found.register(searchTool))

export { indexingNote, offerSearchTool }
