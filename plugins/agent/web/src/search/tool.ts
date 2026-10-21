import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { timeoutMs } from '../http'
import { duckDuckGo, type Hit } from './duckduckgo'

const snippetLength = 600

const input = z.object({
  query: z.string().min(1).describe('What to search for, in a few specific words'),
  count: z.number().int().min(1).max(10).default(8).describe('How many results to return, up to 10'),
})

const snippetOf = (text: string) => (text.length > snippetLength ? `${text.slice(0, snippetLength)}…` : text)

const hitText = ({ title, url, snippet }: Hit, index: number) =>
  [`${index + 1}. ${title || url}`, `   ${url}`, snippet && `   ${snippetOf(snippet)}`].filter(Boolean).join('\n')

export const searchTool: Tool<typeof input> = {
  name: 'web_search',
  description:
    'Search the web with DuckDuckGo. Returns numbered results with title, URL and a snippet. site:example.com limits results to one domain. Snippets can be partial or stale, so read the pages that matter with web_fetch.',
  parallel: true,
  input,
  async run({ query, count }, { signal }) {
    const hits = await duckDuckGo(query, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]))
    return hits.length ? hits.slice(0, count).map(hitText).join('\n\n') : 'No results'
  },
}
