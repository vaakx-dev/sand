import { expect, test } from 'bun:test'
import { bucketOf, outcomeOf, summarize, type Outcome } from '../bench/score'

const located = { confidence: null, usage: { inputTokens: 0, outputTokens: 0 }, costUsd: 0, ms: 0 }
const target = { left: 0.1, top: 0.1, right: 0.2, bottom: 0.2 }

test('size buckets use the square root of the target area', () => {
  expect(bucketOf({ width: 8, height: 8 })).toBe('<12px')
  expect(bucketOf({ width: 160, height: 16 })).toBe('48–96px')
  expect(bucketOf({ width: 200, height: 160 })).toBe('≥96px')
})

test('a hit is a point inside the target box, whatever form the answer took', () => {
  const elements = [{ ref: 'e1', role: 'button', name: 'Go', box: target }]
  expect(outcomeOf({ ...located, hit: { kind: 'point', x: 0.15, y: 0.15 } }, target, []).hit).toBe(true)
  expect(outcomeOf({ ...located, hit: { kind: 'point', x: 0.25, y: 0.15 } }, target, []).hit).toBe(false)
  expect(outcomeOf({ ...located, hit: { kind: 'box', box: { left: 0.12, top: 0.12, right: 0.16, bottom: 0.16 } } }, target, []).hit).toBe(true)
  expect(outcomeOf({ ...located, hit: { kind: 'element', ref: 'e1' } }, target, elements).hit).toBe(true)
  expect(outcomeOf({ ...located, hit: null }, target, elements).hit).toBe(false)
})

const outcome = (variant: string, hit: boolean, ms: number, costUsd: number, error?: string): Outcome => ({
  variant,
  model: 'm',
  effort: 'low',
  strategy: 'single',
  sample: 's',
  source: 'synthetic',
  kind: 'icon',
  bucket: hit ? '<12px' : '≥96px',
  hit,
  ms,
  inputTokens: 100,
  outputTokens: 10,
  costUsd,
  ...(error && { error }),
})

test('summaries give hit rate, latency percentiles and cost per thousand', () => {
  const outcomes = [...Array.from({ length: 19 }, (_, at) => outcome('a', at < 10, (at + 1) * 100, 0.001)), outcome('a', false, 0, 0, 'timeout'), outcome('b', true, 50, 0.002)]
  const [a, b] = summarize(outcomes, item => item.variant)
  expect(a!.count).toBe(20)
  expect(a!.errors).toBe(1)
  expect(a!.hitRate).toBe(0.5)
  expect(a!.byBucket['<12px']).toEqual({ count: 10, hitRate: 1 })
  expect(a!.p50ms).toBe(1000)
  expect(a!.p95ms).toBe(1900)
  expect(a!.costPer1000).toBeCloseTo(0.95)
  expect(b!.key).toBe('b')
})
