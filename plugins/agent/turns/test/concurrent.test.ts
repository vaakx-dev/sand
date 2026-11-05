import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const gate = { type: 'call', name: 'gate' } as const

const said = (text: string) => ({ type: 'text', text }) as const

test('two chats run at the same time, each on its own model source', async () => {
  sand = await startSand([
    { id: 'fake-a', models: ['opus'], replies: [[gate], [said('A is done')]] },
    { id: 'fake-b', models: ['deepseek'], replies: [[gate], [said('B is done')]] },
  ])
  const bothWaiting = Promise.withResolvers<void>()
  let waiting = 0
  sand.tool('gate', async () => {
    if (++waiting === 2) bothWaiting.resolve()
    await bothWaiting.promise
    return 'open'
  })
  const a = sand.chat('fake-a/opus')
  const b = sand.chat('fake-b/deepseek')

  const [first, second] = await Promise.all([sand.turns.run(a, 'go'), sand.turns.run(b, 'go')])

  expect([first.text, second.text]).toEqual(['A is done', 'B is done'])
  expect(a.messages().at(-1)).toEqual({ role: 'assistant', content: [said('A is done')] })
  expect(b.messages().at(-1)).toEqual({ role: 'assistant', content: [said('B is done')] })
})
