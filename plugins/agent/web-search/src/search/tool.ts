import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { SearchBrowser } from './browser'
import { duckDuckGo } from './duckduckgo'
import { hitsText } from './hit'

const timeoutMs = 30_000

const input = z.object({
  query: z.string().min(1).describe('What to search for, in a few specific words'),
  count: z.number().int().min(1).max(10).default(8).describe('How many results to return, up to 10 (default 8)'),
})

export const searchTool = (browser: SearchBrowser): Tool<typeof input> => {
  const search = duckDuckGo(browser)
  return {
    name: 'web_search',
    description:
      'Search the web with DuckDuckGo. Returns numbered results with title, URL and a snippet. site:example.com limits results to one domain; site: with a path finds nothing. Snippets can be partial or stale, so read the pages that matter with web_fetch.',
    input,
    run: async ({ query, count }, { signal }) => hitsText(await search(query, count, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]))),
  }
}
