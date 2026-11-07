import { expect, test } from 'bun:test'
import type { LLMEvent } from '../src/contract'
import { read } from '../src/claude/reader'
import type { ClaudeEvent } from '../src/claude/events'
import { readCompat } from '../src/compat/reader'
import type { CompatChunk } from '../src/compat/chunks'
import { readOpenAI } from '../src/openai/reader'
import type { OpenAIEvent } from '../src/openai/events'

const minute = 60_000

async function* from<T>(events: T[]) {
  yield* events
}

const doneOf = async (events: AsyncIterable<LLMEvent>) => {
  for await (const event of events) if (event.type === 'done') return { usage: event.usage, cacheTtlMs: event.cacheTtlMs }
}

const claudeReply = (fiveMinutes: number, oneHour: number): ClaudeEvent[] => [
  {
    type: 'message_start',
    message: {
      model: 'claude',
      usage: {
        input_tokens: 10,
        cache_read_input_tokens: 500,
        cache_creation_input_tokens: fiveMinutes + oneHour,
        cache_creation: { ephemeral_1h_input_tokens: oneHour },
      },
    },
  },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } },
  { type: 'message_stop' },
]

test('a Claude reply reports what it cached and for how long the cache lasts', async () => {
  expect(await doneOf(read(from(claudeReply(300, 0))))).toEqual({
    usage: { input: 10, output: 7, cacheRead: 500, cacheWrite: 300 },
    cacheTtlMs: 5 * minute,
  })
  expect(await doneOf(read(from(claudeReply(0, 400))))).toEqual({
    usage: { input: 10, output: 7, cacheRead: 500, cacheWrite: 400, cacheWriteLong: 400 },
    cacheTtlMs: 60 * minute,
  })
  expect((await doneOf(read(from(claudeReply(0, 0)))))?.cacheTtlMs).toBeUndefined()
})

test('an OpenAI reply counts cache writes apart from plain input', async () => {
  const events: OpenAIEvent[] = [
    {
      type: 'response.completed',
      response: {
        status: 'completed',
        usage: {
          input_tokens: 12_000,
          output_tokens: 50,
          input_tokens_details: { cached_tokens: 4000, cache_write_tokens: 7000, cache_write_tokens_details: { ttl_12h_tokens: 4000 } },
        },
      },
    },
  ]
  expect(await doneOf(readOpenAI(from(events), 'gpt'))).toEqual({
    usage: { input: 1000, output: 50, cacheRead: 4000, cacheWrite: 7000, cacheWriteLong: 4000 },
    cacheTtlMs: 30 * minute,
  })
})

test('an OpenRouter reply that wrote a Claude cache lasts five minutes', async () => {
  const chunks: CompatChunk[] = [
    { model: 'anthropic/claude', choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: 'stop' }] },
    { usage: { prompt_tokens: 6387, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 6385 } } },
  ]
  expect(await doneOf(readCompat(from(chunks), 'anthropic/claude', 'OpenRouter'))).toEqual({
    usage: { input: 2, output: 3, cacheRead: 0, cacheWrite: 6385 },
    cacheTtlMs: 5 * minute,
  })
})
