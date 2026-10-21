import { parseHTML } from 'linkedom'
import { userAgent } from '../http'

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

export const duckDuckGo = async (query: string, signal: AbortSignal) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'user-agent': userAgent, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query }),
    signal,
  })
  if (!response.ok) throw new Error(`DuckDuckGo answered HTTP ${response.status}`)
  return hitsOf(await response.text())
}
