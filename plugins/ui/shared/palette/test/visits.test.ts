import { expect, test } from 'bun:test'
import { DAY_MS } from '@sand/util'
import { Visits, type Visit } from '../src/visits'

test('recent and repeated opens count more, fade over a week and survive a reload', () => {
  let nowMs = 0
  let saved: Visit[] = []
  const visits = new Visits({ saved, save: next => void (saved = next), now: () => nowMs })
  visits.record('thread:old')
  nowMs = 7 * DAY_MS
  visits.record('thread:new')
  expect(visits.used('thread:old')).toBeLessThan(visits.used('thread:new'))
  visits.record('thread:new')
  expect(visits.used('thread:new')).toBeCloseTo(0.5)
  expect(visits.used('thread:never')).toBe(0)
  const reloaded = new Visits({ saved, save: () => {}, now: () => nowMs })
  expect(reloaded.used('thread:new')).toBeCloseTo(0.5)
})
