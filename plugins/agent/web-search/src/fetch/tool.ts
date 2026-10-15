import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { download } from './download'
import { pageOf, pageText, type Page } from './page'

const keepMs = 15 * 60_000
const keepCount = 40

const input = z.object({
  url: z.string().describe('The http or https URL of the page'),
  offset: z.number().int().min(0).default(0).describe('Character to start from, for reading past the first part of a long page'),
})

const recentPages = () => {
  const pages = new Map<string, { page: Page; at: number }>()
  return async (url: string, signal: AbortSignal) => {
    const kept = pages.get(url)
    if (kept && Date.now() - kept.at < keepMs) return kept.page
    const page = pageOf(await download(new URL(url), signal))
    pages.delete(url)
    pages.set(url, { page, at: Date.now() })
    for (const oldest of pages.keys()) {
      if (pages.size <= keepCount) break
      pages.delete(oldest)
    }
    return page
  }
}

export const fetchTool = (): Tool<typeof input> => {
  const load = recentPages()
  return {
    name: 'web_fetch',
    description: 'Read a web page as markdown, without ads and navigation where possible. Long pages come in parts; the end of each part says which offset to read next.',
    parallel: true,
    input,
    run: async ({ url, offset }, { signal }) => pageText(await load(url, signal), offset),
  }
}
