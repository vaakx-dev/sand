import type { LLMRequest } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import type { SystemPart } from '../src/contract'
import { partsOf } from '../src/measure/parts'

const request: LLMRequest = {
  system: 'x'.repeat(198),
  tools: [],
  messages: [
    { role: 'user', content: [{ type: 'text', text: 'y'.repeat(400) }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'c', content: [{ type: 'text', text: 'z'.repeat(400) }] }] },
  ],
}

const sizes = (parts: ReturnType<typeof partsOf>) => Object.fromEntries(parts.map(part => [part.name, part.size]))

test('splits the request into its parts in proportion and adds up to the measured tokens', () => {
  expect(sizes(partsOf(request, 500, []))).toEqual({ Instructions: 99, Tools: 1, Conversation: 200, 'Tool results': 200 })
  expect(sizes(partsOf(request, 333, []))).toEqual({ Instructions: 65, Tools: 0, Conversation: 135, 'Tool results': 133 })
})

test('carves the parts other plugins own out of the instructions, and leaves out those absent from them', () => {
  const memory: SystemPart = { name: 'Memory', tone: 'orange', chars: () => 98 }
  const plan: SystemPart = { name: 'Plan', tone: 'sky', chars: () => 0 }
  expect(sizes(partsOf(request, 500, [memory, plan]))).toEqual({ Instructions: 50, Memory: 49, Tools: 1, Conversation: 200, 'Tool results': 200 })
})

test('counts only the tools the model has loaded: deferred tools join once found', () => {
  const tool = (name: string) => ({ name, description: 'd'.repeat(400), inputSchema: { type: 'object' } })
  const toolsOf = (tools: LLMRequest['tools']) => sizes(partsOf({ ...request, tools }, 1000, [])).Tools ?? 0
  const loaded = toolsOf([tool('read')])
  expect(toolsOf([tool('read'), { ...tool('calendar'), deferred: { found: false } }])).toEqual(loaded)
  expect(toolsOf([tool('read'), { ...tool('calendar'), deferred: { found: true } }])).toBeGreaterThan(loaded)
})
