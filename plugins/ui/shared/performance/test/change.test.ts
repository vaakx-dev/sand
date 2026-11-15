import { expect, test } from 'bun:test'
import { applied, changeOf } from '../src/change'
import type { ChatRow, PcReport } from '../src/contract'

const chat = (conversation: string, bytes: number): ChatRow => ({ conversation, bytes, cpu: 0, trees: [], title: conversation, place: { kind: 'bot' } })

const report = (patch: Partial<PcReport>): PcReport => ({
  totalBytes: 16,
  freeBytes: 8,
  cpu: 0.1,
  cores: 8,
  bars: { end: 10, values: [null, { cpu: 0.1, memory: 0.5 }, { cpu: 0.2, memory: 0.5 }] },
  chats: [chat('first', 3), chat('second', 2)],
  sand: { bytes: 1, cpu: 0, parts: [] },
  other: { bytes: 1, cpu: 0 },
  ...patch,
})

test('a change carries only what moved and rebuilds the newer report from the older one', () => {
  const old = report({})
  const now = report({
    cpu: 0.3,
    bars: { end: 11, values: [{ cpu: 0.1, memory: 0.5 }, { cpu: 0.4, memory: 0.6 }, { cpu: 0.9, memory: 0.6 }] },
    chats: [chat('third', 5), chat('first', 3)],
  })

  const change = changeOf(old, now)

  expect(change).toEqual({
    cpu: 0.3,
    bars: { end: 11, values: [{ cpu: 0.4, memory: 0.6 }, { cpu: 0.9, memory: 0.6 }] },
    chats: { changed: [chat('third', 5)], gone: ['second'] },
  })
  expect(applied(old, change!)).toEqual(now)
  expect(changeOf(now, now)).toBeUndefined()
})
