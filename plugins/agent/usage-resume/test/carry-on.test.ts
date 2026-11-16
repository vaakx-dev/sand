import type { Billing, LLM, ModelInfo, SourceInfo } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { carryOnOf } from '../src/alternative'

const source = (id: string, billing: Billing): SourceInfo => ({
  id,
  kind: id,
  label: id,
  provider: id,
  billing,
  shown: 1,
  total: 1,
  fresh: 0,
  newModels: 'show',
  search: false,
  slugs: true,
})

const model = (source: string): ModelInfo => ({ id: `${source}/opus`, name: 'opus', label: 'Opus', source, efforts: [] })

const llmOf = (sources: SourceInfo[]): LLM => {
  const models = sources.map(found => model(found.id))
  return {
    stream: () => (async function* () {})(),
    sources: () => sources,
    models: () => models,
    find: id => models.find(found => found.id === id),
    sourceLimits: () => [],
  }
}

test('carrying on picks the same model on another plan account and never a paid key', () => {
  const plan = source('plan', 'plan')
  const key = source('key', 'api')
  const spare = source('spare', 'plan')

  expect(carryOnOf(llmOf([plan, key, spare]), 'plan/opus')).toEqual({ model: 'spare/opus', label: 'Opus', account: 'spare' })
  expect(carryOnOf(llmOf([plan, key]), 'plan/opus')).toBeUndefined()
})
