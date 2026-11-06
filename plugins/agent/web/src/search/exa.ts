import { oneLine } from '@sand/util'
import { z } from 'zod'
import { Fatal, type Hit, type Provider } from './hit'
import { paced } from './pace'

const endpoint = (key?: string) => `https://mcp.exa.ai/mcp?tools=web_search_exa${key ? `&exaApiKey=${encodeURIComponent(key)}` : ''}`

const reply = z.union([
  z.object({ error: z.object({ message: z.string() }) }),
  z.object({
    result: z.object({
      isError: z.boolean().optional(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
    }),
  }),
])

const nothingFound = 'No search results found'
const unreadable = 'Exa sent an unexpected reply'

const field = (block: string, name: string) => {
  const value = new RegExp(`^${name}: (.*)$`, 'm').exec(block)?.[1]?.trim() ?? ''
  return value === 'N/A' ? '' : value
}

const highlightsOf = (block: string) => {
  const found = /\nHighlights:\s*\n/.exec(block)
  return found ? block.slice(found.index + found[0].length).replace(/\n---\s*$/, '').trim() : ''
}

const hitOf = (block: string): Hit => ({
  title: field(block, 'Title'),
  url: field(block, 'URL'),
  snippet: oneLine(highlightsOf(block)),
})

const hitsOf = (text: string): Hit[] => {
  if (text.startsWith(nothingFound)) return []
  const hits = text
    .split(/(?=^Title: )/m)
    .map(hitOf)
    .filter(({ url }) => URL.canParse(url))
  if (!hits.length) throw new Error(`${unreadable}: ${oneLine(text, 200)}`)
  return hits
}

const answerOf = (body: string) => {
  const message = body.split('\n').findLast(line => line.startsWith('data:'))?.slice(5) ?? body
  const parsed = reply.safeParse(JSON.parse(message))
  if (!parsed.success) throw new Error(`${unreadable}: ${oneLine(message, 200)}`)
  if ('error' in parsed.data) throw new Error(`Exa said: ${parsed.data.error.message}`)
  const { isError = false, content } = parsed.data.result
  return { isError, text: content.find(item => item.type === 'text')?.text?.trim() ?? '' }
}

const keyRefusals = new Set([401, 403])

const statusIn = (text: string) => Number(/error \((\d{3})\)/.exec(text)?.[1])

export const exa = (key?: string): Provider => {
  const inTurn = paced(key ? { gapMs: 0, lanes: 4 } : { gapMs: 1500, lanes: 4 })
  const failure = (status: number, message: string) =>
    key && keyRefusals.has(status)
      ? new Fatal(`Exa rejected the [web] exa_api_key in sand.toml (${status}): the key is wrong or expired. Fix or remove it.`)
      : new Error(message)
  return {
    name: 'Exa',
    find: (query, signal) =>
      inTurn(signal, async deadline => {
        const response = await fetch(endpoint(key), {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'web_search_exa', arguments: { query: query.text, numResults: query.count } } }),
          signal: deadline,
        })
        if (!response.ok) throw failure(response.status, `Exa answered HTTP ${response.status}`)
        const { isError, text } = answerOf(await response.text())
        if (isError) throw failure(statusIn(text), `Exa said: ${text || 'no reason given'}`)
        return hitsOf(text)
      }),
  }
}
