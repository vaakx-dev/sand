import { defaultsSet, modelSettings, settingsSet } from '@sand/model/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, beforeEach, expect, test } from 'bun:test'

let sand: Sand

const said = (text: string) => [{ type: 'text', text }] as const

const gate = [{ type: 'call', name: 'gate' }] as const

beforeEach(async () => {
  sand = await startSand([
    { id: 'fake-a', models: ['opus'], replies: [[...gate], [...said('A one')], [...said('A two')]] },
    { id: 'fake-b', models: ['deepseek'], replies: [[...said('B one')], [...said('B two')]] },
  ])
})

afterEach(() => sand.stop())

const opus = 'fake-a/opus'
const deepseek = 'fake-b/deepseek'

const setDefault = (model: string) => sand.ask(defaultsSet, { patch: { model } })

const effective = (id: string) => sand.app.get(modelSettings)?.effective(sand.sessions.require(id)).model

const duringGate = (run: () => unknown) =>
  sand.tool('gate', async () => {
    await run()
    return 'open'
  })

test('a chat that ran keeps its model when the default changes', async () => {
  await setDefault(opus)
  sand.tool('gate', () => 'open')
  const chat = sand.sessions.thread(sand.home)
  await sand.turns.run(chat, 'one')

  await setDefault(deepseek)

  expect(effective(chat.id)).toBe(opus)
  expect((await sand.turns.run(chat, 'two')).text).toBe('A two')
})

test('a default change in the middle of a turn leaves the turn on its model', async () => {
  await setDefault(opus)
  duringGate(() => setDefault(deepseek))
  const chat = sand.sessions.thread(sand.home)

  expect((await sand.turns.run(chat, 'one')).text).toBe('A one')
})

test('a model picked during a turn applies from the next turn', async () => {
  const chat = sand.chat(opus)
  duringGate(() => sand.ask(settingsSet, { session: chat.id, patch: { model: deepseek } }))

  expect((await sand.turns.run(chat, 'one')).text).toBe('A one')
  expect(effective(chat.id)).toBe(deepseek)
  expect((await sand.turns.run(chat, 'two')).text).toBe('B one')
})

test('a turn runs every step on the model it started with', async () => {
  const chat = sand.chat(opus)
  duringGate(() => sand.app.get(modelSettings)?.update(chat, { model: deepseek }))

  expect((await sand.turns.run(chat, 'one')).text).toBe('A one')
})
