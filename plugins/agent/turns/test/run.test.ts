import { llmEvent, type UsageRecord } from '@sand/accounts/contract'
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

  const result = await sand.turns.run(chat, 'ping')

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

  const running = sand.turns.run(chat, 'go')
  await spoke
  expect(sand.turns.interrupt(chat)).toBe(true)

  expect(await running).toMatchObject({ stopReason: 'interrupted' })
  expect(sand.turns.current(chat)).toBeUndefined()
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Thinking it over')] })
  expect(chat.latest('turn-ending')?.data).toEqual({ stopReason: 'interrupted' })
})

test('a model error fails the turn and records why', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Half'), { type: 'error', message: 'overloaded' }]] }])
  const chat = sand.chat('fake/m')

  await expect(sand.turns.run(chat, 'go')).rejects.toThrow('overloaded')

  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Half')] })
  expect(chat.latest('turn-ending')?.data).toEqual({ stopReason: 'error', error: 'overloaded' })
})

test('each tool result is stored as soon as its call finishes, and an interrupt answers the call still running', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'call', name: 'echo', input: { word: 'pong' } }, { type: 'call', name: 'gate' }]] }])
  const gateOpened = Promise.withResolvers<void>()
  sand.tool('echo', ({ word }) => String(word))
  sand.tool('gate', () => {
    gateOpened.resolve()
    return new Promise(() => {})
  })
  const chat = sand.chat('fake/m')

  const running = sand.turns.run(chat, 'go')
  await gateOpened.promise
  const turn = sand.turns.current(chat)!
  const echoed = { role: 'user', content: [{ type: 'tool_result', callId: 'fake-1', content: [said('pong')] }] }
  expect(chat.path().at(-1)).toMatchObject({ turn: turn.id, data: echoed })

  sand.turns.interrupt(chat)

  expect(await running).toMatchObject({ stopReason: 'interrupted' })
  expect(chat.messages().slice(2)).toMatchObject([echoed, { role: 'user', content: [{ type: 'tool_result', callId: 'fake-2', isError: true }] }])
  expect(sand.turns.get(turn.id)).toMatchObject({ status: 'interrupted', stopReason: 'interrupted' })
})

test('each step records its own usage, and the turn adds them up', async () => {
  sand = await startSand([
    {
      id: 'fake',
      models: ['m'],
      replies: [
        [{ type: 'usage', input: 100, output: 10 }, { type: 'call', name: 'echo', input: { word: 'a' } }],
        [{ type: 'usage', input: 150, output: 20 }, said('Done.')],
      ],
    },
  ])
  sand.tool('echo', ({ word }) => String(word))
  const chat = sand.chat('fake/m')

  const result = await sand.turns.run(chat, 'go')

  const steps = chat.path().filter(entry => entry.type === 'usage')
  expect(steps.map(entry => (entry.data as UsageRecord).usage)).toEqual([
    { input: 100, output: 10, cacheRead: 0, cacheWrite: 0 },
    { input: 150, output: 20, cacheRead: 0, cacheWrite: 0 },
  ])
  const total = { input: 250, output: 30, cacheRead: 0, cacheWrite: 0 }
  expect(result.usage).toEqual(total)
  expect(sand.turns.get(steps[0]!.turn!)).toMatchObject({ status: 'completed', step: 2, usage: total })
  expect(steps[1]!.turn).toBe(steps[0]!.turn)
})

test('a chat with no model asks for one before it starts a turn', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'] }])
  const chat = sand.sessions.thread(sand.home)

  await expect(sand.turns.run(chat, 'go')).rejects.toThrow('Pick a model')
  expect(chat.entries()).toEqual([])
})
