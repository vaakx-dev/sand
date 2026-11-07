import { expect, test } from 'bun:test'
import { viewOf } from '../src/catalog/view'
import type { Entry } from '../src/catalog/types'
import { statelessCaps, type Billing, type ModelInfo } from '../src/contract'

const source = (id: string, provider: string, billing: Billing, models: Partial<ModelInfo>[]): Entry => ({
  meta: { id, kind: 'openrouter', label: id, provider, billing, caps: statelessCaps() },
  models: models.map(model => ({ id: `${id}/${model.name}`, label: model.name!, source: id, provider, efforts: [], ...model })),
  newModels: 'show',
})

const view = viewOf(() => [
  source('claude', 'anthropic', 'plan', [{ name: 'claude-sonnet-5-5' }, { name: 'claude-haiku-4-5-20251001' }]),
  source('anthropic', 'anthropic', 'api', [{ name: 'claude-sonnet-5-5' }]),
  source('openrouter', 'openrouter', 'api', [
    { name: 'anthropic/claude-sonnet-5.5' },
    { name: 'anthropic/claude-sonnet-5.5:batch', paid: true },
    { name: 'anthropic/claude-haiku-4.5' },
    { name: 'otherlab/claude-sonnet-5.5' },
    { name: 'deepseek/deepseek-v4' },
  ]),
])

const routed = (id: string) => view.route(id)?.id

test('a subscription runs the metered models it covers unless the user keeps the paid route', () => {
  expect(routed('openrouter/anthropic/claude-sonnet-5.5')).toBe('claude/claude-sonnet-5-5')
  expect(routed('openrouter/anthropic/claude-haiku-4.5')).toBe('claude/claude-haiku-4-5-20251001')
  expect(routed('anthropic/claude-sonnet-5-5')).toBe('claude/claude-sonnet-5-5')
  expect(routed('openrouter/anthropic/claude-sonnet-5.5:batch')).toBe('openrouter/anthropic/claude-sonnet-5.5:batch')
  expect(routed('openrouter/otherlab/claude-sonnet-5.5')).toBe('openrouter/otherlab/claude-sonnet-5.5')
  expect(routed('openrouter/deepseek/deepseek-v4')).toBe('openrouter/deepseek/deepseek-v4')
  expect(view.find('openrouter/anthropic/claude-sonnet-5.5')?.id).toBe('openrouter/anthropic/claude-sonnet-5.5')
  expect(view.models().map(model => model.id)).toEqual([
    'claude/claude-sonnet-5-5',
    'claude/claude-haiku-4-5-20251001',
    'openrouter/anthropic/claude-sonnet-5.5:batch',
    'openrouter/otherlab/claude-sonnet-5.5',
    'openrouter/deepseek/deepseek-v4',
  ])
})
