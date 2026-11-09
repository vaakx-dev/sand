import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { z } from 'zod'
import { threadTools } from '../src/tools'

let sand: Sand

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'text', text: 'pong' }]] }])
})

afterAll(() => sand.stop())

const run = (name: string, input: Record<string, unknown>) => {
  const tool = threadTools.find(each => each.name === name)
  if (!tool) throw new Error(`No thread tool ${name}`)
  return tool.run(tool.input.parse(input), { call: sand.ask, here: sand.home })
}

test('an outside agent starts a thread where it is once per request id, waits for its reply, reads its history and lists it', async () => {
  const started = await run('thread_start', { prompt: 'ping', model: 'fake/m', clientRequestId: 'once' })
  expect(started).toEqual({ thread: expect.any(String), disposition: 'started', turn: expect.any(String) })
  expect(await run('thread_start', { prompt: 'ping', model: 'fake/m', clientRequestId: 'once' })).toEqual(started)
  const { thread, turn } = z.object({ thread: z.string(), turn: z.string() }).parse(started)
  expect(sand.turns.get(turn)?.origin).toBe('mcp')

  expect(await run('thread_wait', { threads: [thread] })).toEqual([{ thread, turn, status: 'completed', reply: 'pong' }])
  expect(await run('history_read', { thread })).toMatchObject({
    items: [
      { role: 'user', text: 'ping' },
      { role: 'assistant', text: 'pong' },
    ],
  })
  expect(await run('thread_list', {})).toEqual([expect.objectContaining({ thread, status: 'completed', cwd: sand.home })])
  await expect(run('thread_send', { thread: 'missing', prompt: 'hello' })).rejects.toThrow('No thread missing')
  await expect(run('history_read', {})).rejects.toThrow('Name the thread or bot')
  await expect(run('history_read', { thread, bot: 'b' })).rejects.toThrow('Give either a thread or a bot')

  const later = '2030-01-02T03:04:05Z'
  expect(await run('thread_update', { thread, title: 'Ping', pinned: true })).toMatchObject({ thread, title: 'Ping', pinned: true, settled: false })
  expect(await run('thread_update', { thread, snoozeUntil: later })).toMatchObject({ snoozed: Date.parse(later) })
  expect(await run('thread_update', { thread, settled: true })).toMatchObject({ settled: true })
  expect(await run('thread_update', { thread, settled: false, snoozeUntil: null })).toMatchObject({ settled: false })
  await expect(run('thread_list', { mine: true })).rejects.toThrow("Only sand's own threads and bots")
})
