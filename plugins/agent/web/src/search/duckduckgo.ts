import { parseHTML } from 'linkedom'
import { userAgent } from '../http'
import type { Hit, Provider } from './hit'
import { paced } from './pace'

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

const botCheck = 'DuckDuckGo answered with a bot check instead of results; try again in a few minutes'

const inTurn = paced({ gapMs: 7000, lanes: 1 })

export const duckDuckGo: Provider = {
  name: 'DuckDuckGo',
  find: ({ text }, signal) =>
    inTurn(signal, async deadline => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'user-agent': userAgent, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: text }),
        signal: deadline,
      })
      if (!response.ok && response.status !== 202) throw new Error(`DuckDuckGo answered HTTP ${response.status}`)
      const page = await response.text()
      const hits = hitsOf(page)
      if (!hits.length && (response.status === 202 || page.includes('anomaly'))) throw new Error(botCheck)
      return hits
    }),
}
