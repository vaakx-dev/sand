import { expect, test } from 'bun:test'
import { budgetOf, currentOf, fits } from '../src/handoff/budget'
import { coverageText, type Rendered } from '../src/handoff/render'
import { select } from '../src/handoff/select'

const room = { cap: 16_000, window: 200_000, native: 10_000, current: 1_000 }

test('a handoff gets what fits after the native context, the prompt and a quarter of the window, up to its cap', () => {
  expect(budgetOf(room)).toBe(16_000)
  expect(budgetOf({ ...room, window: 128_000, native: 90_000 })).toBe(128_000 - 90_000 - 1_000 - 32_000)
  expect(budgetOf({ ...room, window: 32_000, native: 10_000 })).toBe(32_000 - 10_000 - 1_000 - 16_000)
  expect(budgetOf({ ...room, native: 190_000 })).toBe(0)
  expect(budgetOf({ ...room, cap: 100_000 })).toBe(64_000)
  expect(fits({ ...room, window: 128_000, native: 90_000 })).toBe(true)
  expect(fits({ ...room, native: 190_000 })).toBe(false)
})

test('a prompt costs its text plus a fixed allowance per image and attachment', () => {
  const file = { type: 'file', name: 'a.txt', path: '/a.txt', size: 1 } as const
  const image = { type: 'image', mediaType: 'image/png', hash: 'h', size: 1 } as const
  expect(currentOf([{ type: 'text', text: 'hi' }, image, file])).toBe(4 + 8_192 + 4_096)
})

const item = (id: string, role: Rendered['role'], size: number): Rendered => ({ id, role, text: `[Historical ${role}; item=${id}]\n${'x'.repeat(size)}` })

const coverage = coverageText({ models: ['a/m'], first: 1, last: 9, reads: true })

test('a handoff keeps whole items, newest and the first prompt first, skips what does not fit, and reads in order', () => {
  const items = [item('first', 'user', 10), item('old', 'assistant', 100), item('huge', 'assistant', 5_000), item('ask', 'user', 100), item('reply', 'assistant', 10), item('last', 'user', 10)]

  const roomy = select(items, coverage, 2_000)
  expect(roomy.items.map(found => found.id)).toEqual(['first', 'old', 'ask', 'reply', 'last'])
  expect(roomy.items).toContainEqual(items[1]!)
  expect(roomy.omitted).toEqual(['huge'])
  expect(roomy.context).toContain(': 5 shown, 1 left out.')

  const none = select(items, coverage, 0)
  expect(none.items).toEqual([])
  expect(none.context).toContain(': 0 shown, 6 left out.')
})
