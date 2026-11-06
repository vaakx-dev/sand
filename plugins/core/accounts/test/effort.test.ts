import type { Media } from '@sand/media/contract'
import { afterEach, expect, test } from 'bun:test'
import { claudeBody } from '../src/claude/body'
import { compatBody } from '../src/compat/body'
import { toolNames } from '../src/compat/names'
import type { Effort, LLMRequest, ModelInfo } from '../src/contract'
import { discoverAnthropic, discoverOpenRouter } from '../src/discover'
import { openaiBody } from '../src/openai/body'

const media: Media = { put: () => ({ hash: '', size: 0, mediaType: '' }), path: () => '', data: () => undefined, inUse: () => () => {} }

const request = (effort?: Effort): LLMRequest => ({ system: 'Be brief.', messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }], tools: [], ...(effort && { effort }) })

const claude = (effort: Effort | undefined, efforts: Effort[]) => claudeBody(request(effort), { model: 'claude-haiku-5-5', maxTokens: 1000, efforts, fast: false }, false, media)

test('none turns Claude thinking off instead of sending an effort', () => {
  const off = claude('none', ['none', 'low', 'high'])
  expect(off).toMatchObject({ thinking: { type: 'disabled' } })
  expect(off).not.toHaveProperty('output_config')
  expect(claude('low', ['none', 'low'])).toMatchObject({ output_config: { effort: 'low' } })
  expect(claude('none', ['low', 'high'])).not.toHaveProperty('thinking')
})

const gpt: ModelInfo = { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna', efforts: ['none', 'low', 'medium'], defaultEffort: 'medium' }

test('none asks OpenAI for no reasoning and no reasoning summary', () => {
  expect(openaiBody({ ...request('none'), model: 'gpt-6-luna' }, gpt, media)).toMatchObject({ reasoning: { effort: 'none' } })
  expect(openaiBody({ ...request('none'), model: 'gpt-6-luna' }, gpt, media)).not.toHaveProperty('include')
  expect(openaiBody({ ...request(), model: 'gpt-6-luna' }, gpt, media).reasoning).toEqual({ effort: 'medium', summary: 'auto' })
})

const target = (efforts: Effort[]) => ({ base: 'https://openrouter.ai/api/v1', model: 'x', name: 'OpenRouter', efforts })

test('OpenRouter gets only the efforts the model lists', () => {
  expect(compatBody(target(['none', 'low']), request('none'), toolNames([]), media).reasoning).toEqual({ effort: 'none' })
  expect(compatBody(target(['low', 'high']), request('max'), toolNames([]), media)).not.toHaveProperty('reasoning')
})

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const serve = (body: unknown) => {
  globalThis.fetch = Object.assign(async () => Response.json(body), { preconnect: realFetch.preconnect })
}

test('OpenRouter models offer none only when reasoning can be turned off', async () => {
  const model = (id: string, reasoning?: unknown) => ({ id, supported_parameters: ['tools', 'reasoning'], ...(reasoning !== undefined && { reasoning }) })
  serve({
    data: [
      model('optional', { mandatory: false, supported_efforts: ['max', 'low', 'none', 'minimal'], default_effort: 'low' }),
      model('mandatory', { mandatory: true, supported_efforts: ['high', 'none'] }),
      model('unlisted'),
    ],
  })
  const found = await discoverOpenRouter('key')
  expect(found.map(({ name, efforts, defaultEffort }) => ({ name, efforts, defaultEffort }))).toEqual([
    { name: 'optional', efforts: ['none', 'low', 'max'], defaultEffort: 'low' },
    { name: 'mandatory', efforts: ['high'], defaultEffort: undefined },
    { name: 'unlisted', efforts: ['low', 'medium', 'high'], defaultEffort: undefined },
  ])
})

test('Anthropic models offer none when the API says thinking can be disabled', async () => {
  const yes = { supported: true }
  serve({
    data: [
      { id: 'haiku', capabilities: { effort: { supported: true, low: yes, high: yes }, thinking: { types: { disabled: yes } } } },
      { id: 'opus', capabilities: { effort: { supported: true, low: yes }, thinking: { types: { disabled: { supported: false } } } } },
    ],
  })
  const found = await discoverAnthropic({ type: 'api_key', key: 'key' })
  expect(found.map(model => model.efforts)).toEqual([['none', 'low', 'high'], ['low']])
})
