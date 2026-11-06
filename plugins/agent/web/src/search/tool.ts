import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Hit } from './hit'
import { providers, search } from './providers'

const snippetLength = 200

const input = z.object({
  query: z.string().min(1).describe('What to search for, in a few specific words'),
  count: z.number().int().min(1).max(10).default(8).describe('How many results to return, up to 10'),
})

const snippetOf = (text: string) => (text.length > snippetLength ? `${text.slice(0, snippetLength)}…` : text)

const hitText = ({ title, url, snippet }: Hit, index: number) =>
  [`${index + 1}. ${title || url}`, `   ${url}`, snippet && `   ${snippetOf(snippet)}`].filter(Boolean).join('\n')

export const searchTool = (exaApiKey?: string): Tool<typeof input> => {
  const chain = providers(exaApiKey)
  return {
    name: 'web_search',
    description:
      'Search the web. Returns numbered results with title, URL and a short snippet. Snippets are only a hint, so read the pages that matter with web_fetch.',
    parallel: true,
    input,
    effect: 'read',
    async run({ query, count }, { signal }) {
      const hits = (await search(chain, { text: query, count }, signal)).slice(0, count)
      return hits.length ? hits.map(hitText).join('\n\n') : 'No results'
    },
  }
}
