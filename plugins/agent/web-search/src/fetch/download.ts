import { bytes } from '@sand/kit'
import { assertPublic } from './guard'

export interface Download {
  url: string
  type: string
  body: string
}

const maxRedirects = 5
const maxBytes = 5 * 1024 * 1024
const timeoutMs = 30_000

const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  accept: 'text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.5',
}

const readable = (type: string) => !type || /^text\/|html|xml|json|javascript/.test(type)

const bodyOf = async (response: Response) => {
  if (!response.body) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > maxBytes) throw new Error(`The page is bigger than ${bytes(maxBytes)}`)
    chunks.push(chunk)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

const redirectOf = (response: Response, url: URL) => {
  const location = response.headers.get('location')
  return response.status >= 300 && response.status < 400 && location ? new URL(location, url) : undefined
}

export const download = async (start: URL, signal: AbortSignal): Promise<Download> => {
  const limit = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
  let url = start
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublic(url)
    const response = await fetch(url, { headers, redirect: 'manual', signal: limit })
    const next = redirectOf(response, url)
    if (next) {
      url = next
      continue
    }
    if (!response.ok) throw new Error(`${url.href} answered HTTP ${response.status}`)
    const type = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!readable(type)) throw new Error(`web_fetch reads web pages and text, and ${url.href} is ${type}`)
    return { url: url.href, type, body: await bodyOf(response) }
  }
  throw new Error(`${start.href} redirected more than ${maxRedirects} times`)
}
