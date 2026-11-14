import { expect, test } from 'bun:test'
import type { Fit } from '../src/contract'
import { messageRows } from '../src/web/rows'
import type { PcHit } from '../src/web/search'

const DAY_MS = 86_400_000

const hit = (chat: string, fit: Fit, ageDays: number): PcHit => ({
  pc: 'home',
  owner: 'thread',
  chat,
  title: chat,
  entry: `${chat}-entry`,
  block: 0,
  role: 'user',
  at: Date.now() - ageDays * DAY_MS,
  fit,
  excerpt: { text: chat, marks: [] },
})

test('message rows put a better fit first, and recent or often used chats first within a fit', () => {
  const used = (visits: string) => (visits === 'thread:favourite' ? 0.9 : 0)
  const parts = { used, tint: () => undefined, open: () => {} }
  const hits = [hit('fresh-prefix', 'prefixes', 0), hit('old-words', 'words', 300), hit('favourite', 'words', 30), hit('recent', 'words', 1), hit('old-phrase', 'phrase', 400)]

  expect(messageRows(parts, hits).map(row => row.label)).toEqual(['old-phrase', 'favourite', 'recent', 'old-words', 'fresh-prefix'])
})
