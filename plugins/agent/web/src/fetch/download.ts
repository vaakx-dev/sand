import { bytes } from '@sand/util'
import { timeoutMs, userAgent } from '../http'

export interface Download {
  url: string
  type: string
  body: string
}

const maxBytes = 5 * 1024 * 1024
const headers = { 'user-agent': userAgent, accept: 'text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.5' }

const readable = (type: string) => !type || /^text\/|html|xml|json|javascript/.test(type)

const bodyOf = async (response: Response) => {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error(`The page is bigger than ${bytes(maxBytes)}`)
  const body = await response.bytes()
  if (body.byteLength > maxBytes) throw new Error(`The page is bigger than ${bytes(maxBytes)}`)
  return new TextDecoder().decode(body)
}

export const download = async (url: string, signal: AbortSignal): Promise<Download> => {
  const target = URL.parse(url)
  if (!target || !/^https?:$/.test(target.protocol)) throw new Error(`web_fetch reads http and https URLs, and ${url} is not one`)
  const response = await fetch(target, { headers, signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) })
  if (!response.ok) throw new Error(`${response.url || url} answered HTTP ${response.status}`)
  const type = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!readable(type)) throw new Error(`web_fetch reads web pages and text, and ${url} is ${type}`)
  return { url: response.url || url, type, body: await bodyOf(response) }
}
