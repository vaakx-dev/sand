import { describe, expect, test } from 'bun:test'
import { type Billing, matchModel, type ModelInfo } from '../src/contract'

const model = (source: string): ModelInfo => ({ id: `${source}/opus`, name: 'opus', label: 'Opus', source, efforts: [] })

const models = [model('anthropic'), model('openrouter'), model('claude')]
const bills: Record<string, Billing> = { anthropic: 'api', openrouter: 'credits', claude: 'plan' }
const billing = (source: string) => bills[source]

describe('matchModel', () => {
  test('a bare name prefers a subscription over a pay-per-use key', () => {
    expect(matchModel('Opus', models, { billing })).toBe('claude/opus')
  })

  test("a bare name stays on the caller's source", () => {
    expect(matchModel('opus', models, { billing, prefer: 'openrouter' })).toBe('openrouter/opus')
  })

  test('an exact id keeps its source', () => {
    expect(matchModel('anthropic/opus', models, { billing, prefer: 'claude' })).toBe('anthropic/opus')
  })
})
