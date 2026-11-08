import { expect, test } from 'bun:test'
import { applyChoice, effective } from '../src/web/models'

test('a model patch sets, keeps or clears each field, and never stores speed', () => {
  const choice = { model: 'opus', effort: 'high' as const }
  expect(applyChoice(choice, { effort: 'low' })).toEqual({ model: 'opus', effort: 'low' })
  expect(applyChoice(choice, { model: null, speed: 'fast' })).toEqual({ effort: 'high' })
})

test("a bot's empty choice shows the defaults it runs with", () => {
  expect(effective({ effort: 'low' }, { model: 'sonnet', effort: 'high' })).toEqual({ model: 'sonnet', effort: 'low' })
})
