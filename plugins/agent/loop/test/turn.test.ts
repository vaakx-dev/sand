import { llmEvent } from '@sand/accounts/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

test('a turn runs the tools the model calls and answers with their results', async () => {
  sand = await startSand([
    {
      id: 'fake',
      models: ['m'],
      replies: [[said('Let me '), said('look.'), { type: 'call', name: 'echo', input: { word: 'pong' } }], [said('It said pong.')]],
    },
  ])
  sand.tool('echo', ({ word }) => String(word))
  const chat = sand.chat('fake/m')

  const result = await sand.loop.run(chat, 'ping')

  expect(result).toMatchObject({ stopReason: 'end_turn', text: 'It said pong.' })
  expect(chat.messages()).toEqual([
    { role: 'user', content: [said('ping')] },
    { role: 'assistant', content: [said('Let me look.'), { type: 'tool_call', id: 'fake-1', name: 'echo', input: { word: 'pong' } }] },
    { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('pong')] }] },
    { role: 'assistant', content: [said('It said pong.')] },
  ])
})

test('an interrupt stops the turn and keeps what the model said so far', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Thinking it over'), { type: 'hold' }]] }])
  const chat = sand.chat('fake/m')
  const spoke = new Promise<void>(resolve => sand.app.on(llmEvent, event => void (event.type === 'text' && resolve())))

  const running = sand.loop.run(chat, 'go')
  await spoke
  expect(sand.loop.interrupt(chat)).toBe(true)

  expect(await running).toMatchObject({ stopReason: 'interrupted' })
  expect(sand.loop.active(chat)).toBe(false)
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Thinking it over')] })
  expect(chat.latest('turn-ending')?.data).toEqual({ stopReason: 'interrupted' })
})

test('a model error fails the turn and records why', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Half'), { type: 'error', message: 'overloaded' }]] }])
  const chat = sand.chat('fake/m')

  await expect(sand.loop.run(chat, 'go')).rejects.toThrow('overloaded')

  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Half')] })
  expect(chat.latest('turn-ending')?.data).toEqual({ stopReason: 'error', error: 'overloaded' })
})
