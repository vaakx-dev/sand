import type { ModelInfo } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { quickChoice } from '../src/quick'

const model = (id: string, extra: Partial<ModelInfo> = {}): ModelInfo => ({ id, label: id, efforts: ['low', 'medium', 'high'], ...extra })

const prices: Record<string, number> = { 'a/big': 75, 'a/small': 4, 'a/hidden': 1, 'b/tiny': 0.5 }

const catalog = {
  models: [model('a/big'), model('a/small'), model('a/hidden', { hidden: true }), model('a/unpriced'), model('b/tiny')],
  price: (id: string) => (id in prices ? { input: 0, output: prices[id]!, cacheRead: 0, cacheWrite: 0 } : undefined),
}

test("the quick model is the cheapest visible model from the main model's source, at its lowest effort", () => {
  expect(quickChoice(catalog, 'a/big')).toEqual({ model: 'a/small', effort: 'low' })
  expect(quickChoice(catalog, 'b/anything')).toEqual({ model: 'b/tiny', effort: 'low' })
  expect(quickChoice(catalog, 'c/other')).toEqual({})
  expect(quickChoice(catalog, undefined)).toEqual({})
})
