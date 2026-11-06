import { expect, test } from 'bun:test'
import { boxes, seedOf } from '../src/face/seed'

const ids = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)

test('a bot keeps its face: the same id always gives the same seed', () => {
  const id = crypto.randomUUID()
  expect(seedOf(id)).toEqual(seedOf(id))
  expect(seedOf('calendar')).toEqual(seedOf('calendar'))
})

test('faces spread across every box shape and differ between bots', () => {
  const seeds = ids.map(seedOf)
  const used = new Set(seeds.map(seed => seed.box))
  expect([...used].sort()).toEqual([...boxes].sort())
  for (const box of boxes) expect(seeds.filter(seed => seed.box === box).length).toBeGreaterThan(ids.length / boxes.length / 2)
  expect(new Set(seeds.map(seed => JSON.stringify(seed))).size).toBe(ids.length)
})
