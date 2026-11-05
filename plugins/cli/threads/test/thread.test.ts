import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, spyOn, test } from 'bun:test'
import { threadAction } from '../src/actions'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const printed = spyOn(console, 'log')
spyOn(console, 'error').mockImplementation(() => {})

const thread = async (args: string[], values: Record<string, string | boolean> = {}) => {
  printed.mockClear()
  printed.mockImplementation(() => {})
  const action = threadAction(args, { json: true, model: 'fake/m', ...values }, sand.home)
  if (!action) throw new Error(`sand thread ${args.join(' ')} is not a command`)
  const code = await action(sand.ask)
  return { code, out: JSON.parse(String(printed.mock.calls.at(-1)?.[0])) }
}

test('sand thread exits 0 when done, 3 while the thread waits on you, 130 once stopped and 1 when the turn fails', async () => {
  sand = await startSand([
    {
      id: 'fake',
      models: ['m'],
      replies: [[said('Done.')], [{ type: 'call', name: 'ask' }], [said('Still going'), { type: 'hold' }], [{ type: 'error', message: 'overloaded' }]],
    },
  ])
  sand.tool('ask', (_, context) => {
    context.wait({ kind: 'question', call: context.call.id, title: 'Which branch?' })
    return new Promise<string>(() => {})
  })

  const started = await thread(['start', 'hi'], { wait: true })
  expect(started).toEqual({ code: 0, out: { thread: expect.any(String), turn: expect.any(String), status: 'completed', reply: 'Done.' } })
  const id = started.out.thread

  expect(await thread(['send', id, 'ask me'], { wait: true })).toMatchObject({ code: 3, out: { status: 'waiting', waiting: { title: 'Which branch?' } } })
  expect(await thread(['stop', id])).toEqual({ code: 0, out: { thread: id, stopped: true } })
  expect(await thread(['wait', id])).toMatchObject({ code: 130, out: { status: 'interrupted' } })

  expect(await thread(['send', id, 'keep going'])).toMatchObject({ code: 0, out: { status: 'running' } })
  await thread(['stop', id])
  expect(await thread(['send', id, 'and fail'], { wait: true })).toMatchObject({ code: 1, out: { status: 'failed', error: 'overloaded' } })
  expect(threadAction(['start'], {}, sand.home)).toBeUndefined()
})
