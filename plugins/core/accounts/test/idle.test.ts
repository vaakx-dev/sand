import { expect, test } from 'bun:test'
import { type LLMEvent, StreamStalled } from '../src/contract'
import { watchIdle } from '../src/idle'

const collect = async (events: AsyncIterable<LLMEvent>) => {
  const seen: LLMEvent[] = []
  for await (const event of events) seen.push(event)
  return seen
}

test('a stream that keeps sending events runs past the idle limit', async () => {
  async function* steady() {
    for (let index = 0; index < 8; index++) {
      await Bun.sleep(40)
      yield { type: 'text', index: 0, text: `${index}` } satisfies LLMEvent
    }
  }

  expect(await collect(watchIdle('m', 100, steady))).toHaveLength(8)
})

test('a stream that goes silent is aborted with a stall naming the model', async () => {
  let upstream: AbortSignal | undefined
  async function* silent(signal: AbortSignal) {
    upstream = signal
    yield { type: 'start', model: 'm' } satisfies LLMEvent
    await new Promise(() => {})
  }

  const stalled = collect(watchIdle('fake/m', 50, silent))

  await expect(stalled).rejects.toBeInstanceOf(StreamStalled)
  await expect(stalled).rejects.toThrow(/fake\/m sent nothing for \d+s/)
  expect(upstream?.aborted).toBe(true)
})
