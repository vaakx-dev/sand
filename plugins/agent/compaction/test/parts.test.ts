import type { LLMRequest } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { partsOf } from '../src/measure/parts'

const request: LLMRequest = {
  system: 'x'.repeat(198),
  tools: [],
  messages: [
    { role: 'user', content: [{ type: 'text', text: 'y'.repeat(400) }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'c', content: [{ type: 'text', text: 'z'.repeat(400) }] }] },
  ],
}

test('splits the request into its parts in proportion and adds up to the measured tokens', () => {
  expect(partsOf(request, 500)).toEqual({ system: 99, tools: 1, conversation: 200, results: 200 })
  expect(partsOf(request, 333)).toEqual({ system: 65, tools: 0, conversation: 135, results: 133 })
})

test('counts only the tools the model has loaded: deferred tools join once found', () => {
  const tool = (name: string) => ({ name, description: 'd'.repeat(400), inputSchema: { type: 'object' } })
  const withTools = (tools: LLMRequest['tools']) => partsOf({ ...request, tools }, 1000)
  const loaded = withTools([tool('read')])
  expect(withTools([tool('read'), { ...tool('calendar'), deferred: { found: false } }])).toEqual(loaded)
  expect(withTools([tool('read'), { ...tool('calendar'), deferred: { found: true } }]).tools).toBeGreaterThan(loaded.tools)
})
