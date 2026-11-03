import type { Hit, Provider } from './hit'
import { paced } from './pace'

const endpoint = (key?: string) => `https://mcp.exa.ai/mcp?tools=web_search_exa${key ? `&exaApiKey=${encodeURIComponent(key)}` : ''}`

interface Block {
  title: string
  url: string
  snippet: string
}

const field = (block: string, name: string) => {
  const value = new RegExp(`^${name}: (.*)$`, 'm').exec(block)?.[1]?.trim() ?? ''
  return value === 'N/A' ? '' : value
}

const highlightsOf = (block: string) => {
  const found = /\nHighlights:\s*\n/.exec(block)
  return found ? block.slice(found.index + found[0].length).replace(/\n---\s*$/, '').trim() : ''
}

const blockOf = (block: string): Block => ({
  title: field(block, 'Title'),
  url: field(block, 'URL'),
  snippet: highlightsOf(block).replace(/\s+/g, ' ').trim(),
})

const hitsOf = (text: string): Hit[] =>
  text
    .split(/(?=^Title: )/m)
    .map(blockOf)
    .filter(({ url }) => URL.canParse(url))

const payloadOf = (body: string) => {
  for (const line of body.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (!payload) continue
    try {
      const parsed = JSON.parse(payload)
      if (parsed?.result || parsed?.error) return parsed
    } catch {}
  }
  return JSON.parse(body)
}

const inTurn = paced(1500)

export const exa = (key?: string): Provider => (query, count, signal) =>
  inTurn(signal, async () => {
    const response = await fetch(endpoint(key), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'web_search_exa', arguments: { query, numResults: count } } }),
      signal,
    })
    if (!response.ok) throw new Error(`Exa answered HTTP ${response.status}`)
    const result = payloadOf(await response.text())?.result
    if (result?.isError) {
      const said = result.content?.find((item: { type: string }) => item.type === 'text')?.text?.trim()
      throw new Error(`Exa said: ${said ?? 'no reason given'}`)
    }
    const text = result?.content?.find((item: { type: string }) => item.type === 'text')?.text
    if (!text) throw new Error('Exa answered with nothing')
    return hitsOf(text)
  })
