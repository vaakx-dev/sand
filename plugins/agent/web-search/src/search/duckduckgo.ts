import type { Cdp } from '@sand/browser-engine/chrome'
import type { SearchBrowser } from './browser'
import { snippetOf, type SearchHit } from './hit'

interface PageState {
  loaded: boolean
  hits: SearchHit[]
}

const pollMs = 150
const waitMs = 10_000
const emptyAfterLoadMs = 1500

const readPage = `({
  loaded: document.readyState === 'complete',
  hits: Array.from(document.querySelectorAll('article[data-testid="result"]'), result => {
    const link = result.querySelector('[data-testid="result-title-a"]')
    return { title: link?.innerText ?? '', url: link?.href ?? '', snippet: result.querySelector('[data-result="snippet"]')?.innerText ?? '' }
  }),
})`

const read = async (page: Cdp) => (await page.send<{ result: { value: PageState } }>('Runtime.evaluate', { expression: readPage, returnByValue: true })).result.value

const resultsOf = async (page: Cdp, signal: AbortSignal) => {
  const deadline = Date.now() + waitMs
  let loadedAt: number | undefined
  while (Date.now() < deadline) {
    signal.throwIfAborted()
    const { loaded, hits } = await read(page)
    if (hits.length) return hits
    if (loaded) loadedAt ??= Date.now()
    if (loadedAt && Date.now() - loadedAt > emptyAfterLoadMs) return []
    await Bun.sleep(pollMs)
  }
  return []
}

const organic = ({ url }: SearchHit) => {
  const parsed = URL.parse(url)
  return !!parsed && parsed.protocol.startsWith('http') && !parsed.hostname.endsWith('duckduckgo.com')
}

export const duckDuckGo = (browser: SearchBrowser) => (query: string, count: number, signal: AbortSignal) =>
  browser.page(async page => {
    await page.send('Page.navigate', { url: `https://duckduckgo.com/?${new URLSearchParams({ q: query })}` })
    const hits = await resultsOf(page, signal)
    return hits
      .filter(organic)
      .slice(0, count)
      .map(hit => ({ title: hit.title.trim(), url: hit.url, snippet: snippetOf(hit.snippet) }))
  })
