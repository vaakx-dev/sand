import { expect, test } from 'bun:test'
import type { Client } from '../src/api/client'
import { restError } from '../src/api/errors'
import { createEvents } from '../src/api/events'

const pull = { repo: 'acme/tiles', number: 7 }

const timings = { silenceMs: 1_000, backoffMs: () => 1 }

const streamOf = (...frames: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) controller.enqueue(new TextEncoder().encode(frame))
        controller.close()
      },
    }),
  )

const fakeClient = (answer: () => unknown, streams: (() => Response)[]) => {
  const calls: string[] = []
  const client: Client = {
    rest: async <T>(method: string, path: string) => {
      calls.push(`${method} ${path}`)
      return (method === 'POST' ? answer() : undefined) as T
    },
    stream: async () => streams.shift()?.() ?? new Response(null, { status: 404 }),
  }
  return { client, calls }
}

const count = async (changes: AsyncIterable<void>) => {
  let heard = 0
  for await (const _ of changes) heard++
  return heard
}

test('a pull request stream reports each change, renews an expired subscription and ends when GitHub stops serving it', async () => {
  let subscriptions = 0
  const { client, calls } = fakeClient(
    () => ({ id: ++subscriptions, events_url: `https://api.github.com/streams/${subscriptions}` }),
    [
      () => streamOf('event: com.github.pull_request.review.submitted.v1\ndata: {}\n\n', ': keep-alive\n\n', 'event: github.stream.end\ndata: {"outcome":"subscription_ended"}\n\n'),
      () => streamOf('event: com.github.pull_request.state.changed.v1\ndata: {}\n\n'),
    ],
  )

  const heard = await count(createEvents(client, timings)(pull, new AbortController().signal))

  expect(heard).toBe(4)
  expect(calls.filter(call => call.startsWith('POST'))).toHaveLength(2)
  expect(calls.filter(call => call.startsWith('DELETE'))).toEqual(['DELETE /event-subscriptions/1', 'DELETE /event-subscriptions/2'])
})

test('an account without event streams is asked once, and polling covers it', async () => {
  const { client, calls } = fakeClient(() => {
    throw restError(403, { message: 'Event subscriptions are not enabled for this account' })
  }, [])
  const changes = createEvents(client, timings)

  expect(await count(changes(pull, new AbortController().signal))).toBe(0)
  expect(await count(changes({ ...pull, number: 8 }, new AbortController().signal))).toBe(0)
  expect(calls).toEqual(['POST /event-subscriptions'])
})

test('a stream URL off GitHub’s API is never opened with the token', async () => {
  let opened = false
  const { client } = fakeClient(() => ({ id: 1, events_url: 'https://elsewhere.example.com/stream' }), [
    () => {
      opened = true
      return streamOf('data: {}\n\n')
    },
  ])

  expect(await count(createEvents(client, timings)(pull, new AbortController().signal))).toBe(0)
  expect(opened).toBe(false)
})
