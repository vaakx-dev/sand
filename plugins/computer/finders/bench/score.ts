import type { Box, UiElement } from '@sand/computers/contract'
import { pointOf, type Located } from '../src/contract'
import { contains } from '../src/frame'

export const buckets = ['<12px', '12–24px', '24–48px', '48–96px', '≥96px'] as const

export type Bucket = (typeof buckets)[number]

const edges = [12, 24, 48, 96]

export const bucketOf = ({ width, height }: { width: number; height: number }): Bucket => {
  const side = Math.sqrt(width * height)
  const index = edges.findIndex(edge => side < edge)
  return buckets[index === -1 ? buckets.length - 1 : index]!
}

export interface Outcome {
  variant: string
  model: string
  effort: string
  strategy: string
  sample: string
  source: string
  kind: string
  bucket: Bucket
  hit: boolean
  ms: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  error?: string
}

export const outcomeOf = (located: Located, target: Box, elements: UiElement[]) => {
  const point = pointOf(located.hit, elements)
  return { hit: point !== null && contains(target, point), point }
}

const percentile = (sorted: number[], share: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)]! : 0)

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

export interface Summary {
  key: string
  count: number
  errors: number
  hitRate: number
  byBucket: Partial<Record<Bucket, { count: number; hitRate: number }>>
  p50ms: number
  p95ms: number
  inputTokens: number
  outputTokens: number
  costPer1000: number
}

const summaryOf = (key: string, outcomes: Outcome[]): Summary => {
  const ms = outcomes.filter(outcome => !outcome.error).map(outcome => outcome.ms).sort((a, b) => a - b)
  const byBucket: Summary['byBucket'] = {}
  for (const bucket of buckets) {
    const inBucket = outcomes.filter(outcome => outcome.bucket === bucket)
    if (inBucket.length) byBucket[bucket] = { count: inBucket.length, hitRate: inBucket.filter(outcome => outcome.hit).length / inBucket.length }
  }
  return {
    key,
    count: outcomes.length,
    errors: outcomes.filter(outcome => outcome.error).length,
    hitRate: outcomes.filter(outcome => outcome.hit).length / outcomes.length,
    byBucket,
    p50ms: percentile(ms, 0.5),
    p95ms: percentile(ms, 0.95),
    inputTokens: mean(outcomes.map(outcome => outcome.inputTokens)),
    outputTokens: mean(outcomes.map(outcome => outcome.outputTokens)),
    costPer1000: mean(outcomes.map(outcome => outcome.costUsd)) * 1000,
  }
}

export const summarize = (outcomes: Outcome[], keyOf: (outcome: Outcome) => string) => {
  const groups = Map.groupBy(outcomes, keyOf)
  return [...groups].map(([key, group]) => summaryOf(key, group))
}
