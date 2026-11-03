import { serial } from '@sand/util'
import { parseHTML } from 'linkedom'
import { timeoutMs, userAgent } from '../http'

export interface Hit {
  title: string
  url: string
  snippet: string
}

const endpoint = 'https://html.duckduckgo.com/html/'
const flat = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

const targetOf = (href: string) => {
  const url = URL.parse(href, endpoint)
  if (!url) return undefined
  const redirect = url.hostname.endsWith('duckduckgo.com') ? url.searchParams.get('uddg') : url.href
  return redirect && /^https?:/.test(redirect) && !URL.parse(redirect)?.hostname.endsWith('duckduckgo.com') ? redirect : undefined
}

const hitsOf = (html: string): Hit[] =>
  [...parseHTML(html).document.querySelectorAll('.result:not(.result--ad)')].flatMap(result => {
    const link = result.querySelector('.result__a')
    const url = targetOf(link?.getAttribute('href') ?? '')
    return url ? [{ title: flat(link?.textContent), url, snippet: flat(result.querySelector('.result__snippet')?.textContent) }] : []
  })

const botCheck = 'DuckDuckGo answered with a bot check instead of results. It blocks an address for minutes at a time, so search again later rather than straight away.'

const gapMs = 7000

const hitsIn = async (query: string, signal: AbortSignal) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'user-agent': userAgent, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  })
  if (!response.ok && response.status !== 202) throw new Error(`DuckDuckGo answered HTTP ${response.status}`)
  const page = await response.text()
  const hits = hitsOf(page)
  if (!hits.length && (response.status === 202 || page.includes('anomaly'))) throw new Error(botCheck)
  return hits
}

let lastAskedAt = 0

const afterGap = async (signal: AbortSignal) => {
  const wait = lastAskedAt + gapMs - Date.now()
  if (wait > 0) await Bun.sleep(wait)
  signal.throwIfAborted()
  lastAskedAt = Date.now()
}

const oneAtATime = serial()

export const duckDuckGo = (query: string, signal: AbortSignal) => oneAtATime(() => afterGap(signal).then(() => hitsIn(query, signal)))
