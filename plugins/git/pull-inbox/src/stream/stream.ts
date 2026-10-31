import { type PullSummary, pullKey } from '@sand/github/contract'
import { serial } from '@sand/util'
import type { Found, FoundPage, Source } from '../search/page'

export const most = 500

export type FetchPage = (source: Source, after?: string) => Promise<FoundPage>

interface Feed {
  source: Source
  buffer: Found[]
  after: string | undefined
  done: boolean
}

export interface Taken {
  found: Found[]
  rest: boolean
}

export interface PullStream {
  take(count: number): Promise<Taken>
  patch(summary: PullSummary): Found | undefined
}

const newer = (best: Feed | undefined, feed: Feed) => {
  const head = feed.buffer[0]
  if (!head) return best
  const leader = best?.buffer[0]
  return leader && leader.summary.updated >= head.summary.updated ? best : feed
}

export const createStream = (sources: Source[], fetchPage: FetchPage): PullStream => {
  const feeds: Feed[] = sources.map(source => ({ source, buffer: [], after: undefined, done: false }))
  const emitted: Found[] = []
  const keys = new Set<string>()
  const queue = serial()

  const fill = async (feed: Feed) => {
    while (!feed.buffer.length && !feed.done) {
      const page = await fetchPage(feed.source, feed.after)
      feed.buffer = page.found
      feed.after = page.cursor
      feed.done = !page.cursor
    }
  }

  const next = async () => {
    await Promise.all(feeds.map(fill))
    return feeds.reduce<Feed | undefined>(newer, undefined)?.buffer.shift()
  }

  const remaining = () => feeds.some(feed => feed.buffer.length > 0 || !feed.done)

  const grow = async (count: number): Promise<Taken> => {
    const wanted = Math.min(count, most)
    while (emitted.length < wanted) {
      const found = await next()
      if (!found) break
      const key = pullKey(found.summary)
      if (keys.has(key)) continue
      keys.add(key)
      emitted.push(found)
    }
    return { found: emitted.slice(0, wanted), rest: emitted.length > wanted || remaining() }
  }

  const replace = (list: Found[], summary: PullSummary) => {
    const key = pullKey(summary)
    let patched: Found | undefined
    list.forEach((found, index) => {
      if (pullKey(found.summary) !== key) return
      list[index] = { ...found, summary }
      patched ??= list[index]
    })
    return patched
  }

  return {
    take: count => queue(() => grow(count)),
    patch(summary) {
      const shown = replace(emitted, summary)
      const buffered = feeds.map(feed => replace(feed.buffer, summary))
      return shown ?? buffered.find(Boolean)
    },
  }
}
