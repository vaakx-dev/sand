import type { LLM, ModelInfo, SourceInfo } from '@sand/accounts/contract'
import { startSand } from '@sand/harness'
import { modelSettings, roleOfLevel } from '@sand/model/contract'
import { expect, test } from 'bun:test'
import { pick } from '../src/roles'

const model = (id: string, hidden?: true): ModelInfo => ({ id, label: id, source: id.split('/')[0], efforts: [], ...(hidden && { hidden }) })

const account = (id: string, state: Partial<SourceInfo> = {}) => ({ id, ...state }) as SourceInfo

interface Offer {
  models: ModelInfo[]
  accounts?: SourceInfo[]
  spent?: string[]
}

const llmOf = ({ models, accounts = [], spent = [] }: Offer): LLM =>
  ({
    models: () => models,
    find: (id: string) => models.find(found => found.id === id),
    accounts: () => accounts,
    sourceLimits: () => spent.map(source => ({ source, updated: 0, windows: [{ used: 1 }] })),
    stream: async function* () {},
  }) as unknown as LLM

test('the lead is the best ranked model the user has', () => {
  const llm = llmOf({ models: [model('anthropic/claude-sonnet-5-5'), model('openai/gpt-6-luna'), model('claude/claude-haiku-5-5')] })

  expect(pick(llm, 'lead').model).toBe('openai/gpt-6-luna')
  expect(pick(llm, 'builder').model).toBe('anthropic/claude-sonnet-5-5')
  expect(pick(llm, 'finder').model).toBe('claude/claude-haiku-5-5')
})

test('a finder falls back to the builder list when no cheap model is ranked', () => {
  const llm = llmOf({ models: [model('claude/claude-sonnet-5-5')] })

  expect(pick(llm, 'finder').model).toBe('claude/claude-sonnet-5-5')
})

test('a model whose account is offline, errored or out of quota is skipped', () => {
  const models = [model('claude/claude-opus-5-5'), model('codex/gpt-6-luna'), model('anthropic/claude-opus-5-5'), model('openai/gpt-6-luna')]
  const accounts = [account('claude', { online: false }), account('codex', { error: 'signed out' }), account('anthropic'), account('openai')]

  expect(pick(llmOf({ models, accounts }), 'lead').model).toBe('anthropic/claude-opus-5-5')
  expect(pick(llmOf({ models, accounts, spent: ['anthropic'] }), 'lead').model).toBe('openai/gpt-6-luna')
})

test('without a ranked working model the first visible model is used', () => {
  const llm = llmOf({ models: [model('local/hidden', true), model('local/first'), model('local/second')] })

  expect(pick(llm, 'lead').model).toBe('local/first')
  expect(pick(llm, 'finder').model).toBe('local/first')
  expect(pick(undefined, 'lead')).toEqual({})
})

test('a chosen model wins for its chat, and bot chats use the lead', async () => {
  const sand = await startSand([
    { id: 'fake-a', models: ['opus'], replies: [] },
    { id: 'fake-b', models: ['deepseek'], replies: [] },
  ])
  try {
    const settings = sand.app.get(modelSettings)!
    const chosen = sand.chat('fake-b/deepseek')
    const bot = sand.sessions.bot('b1', sand.home)

    expect(settings.effective(chosen).model).toBe('fake-b/deepseek')
    expect(settings.effective(bot).model).toBe(settings.role('lead').model)
    expect(settings.level('light')).toEqual(settings.role(roleOfLevel('light')))
  } finally {
    await sand.stop()
  }
})
