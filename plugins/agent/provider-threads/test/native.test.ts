import { llm, llmEvent } from '@sand/accounts/contract'
import { type Session } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const app = (replies: Source['replies'], more: Partial<Source> = {}): Source => ({ id: 'n', models: ['m'], replies, ...more })

const handoff = /^Earlier messages of this chat, [^]*\n(two|three)$/

const query = <T>(sql: string) => sand.app.get(ledger)!.db.query<T, []>(sql).all()

const generations = () =>
  query<{ generation: number; status: string }>("select generation, status from provider_threads where source = 'n' order by created").map(
    ({ generation, status }) => `${generation}:${status}`,
  )

const lastDelivery = () => query<{ delivery: string }>('select delivery from handoffs order by at desc, rowid desc').at(0)?.delivery

const threadOf = (chat: Session) => sand.turns.get(chat.path().at(-1)!.turn!)!.providerThread!

const kinds = () => sand.native('n').map(call => call.type)

const sent = () => sand.native('n').flatMap(call => (call.type === 'send' ? [call.text] : []))

test('a released native thread is reopened by its native id and sent only what is new', async () => {
  sand = await startSand([app([[{ type: 'call', id: 'c1', name: 'echo', input: { word: 'x' } }], [said('n1')], [said('n2')]])])
  sand.tool('echo', ({ word }) => String(word))
  const chat = sand.chat('n/m')

  await sand.turns.run(chat, 'one')
  sand.app.get(llm)!.release!(threadOf(chat))
  await sand.turns.run(chat, 'two')

  expect(sand.native('n')).toEqual([
    { type: 'open', cwd: sand.home },
    { type: 'send', text: 'one' },
    { type: 'answer', id: 'c1', text: 'x' },
    { type: 'close' },
    { type: 'open', cwd: sand.home, resume: 'n-thread-1' },
    { type: 'send', text: 'two' },
  ])
  expect(generations()).toEqual(['1:idle'])
})

test('a source that cannot resume starts a new generation with a full handoff once its process is gone', async () => {
  sand = await startSand([app([[said('n1')], [said('n2')]], { resume: false })])
  const chat = sand.chat('n/m')

  await sand.turns.run(chat, 'one')
  sand.app.get(llm)!.release!(threadOf(chat))
  await sand.turns.run(chat, 'two')

  expect(kinds()).toEqual(['open', 'send', 'close', 'open', 'send'])
  expect(sent()[1]).toMatch(handoff)
  expect(generations()).toEqual(['1:retired', '2:idle'])
})

test('a native process that dies mid-step loses only that generation, and the step is retried with a full handoff', async () => {
  sand = await startSand([app([[said('n1')], [{ type: 'crash' }], [said('n2')]])])
  const chat = sand.chat('n/m')

  await sand.turns.run(chat, 'one')
  const result = await sand.turns.run(chat, 'two')

  expect(result).toMatchObject({ stopReason: 'end_turn', text: 'n2' })
  expect(kinds()).toEqual(['open', 'send', 'send', 'close', 'open', 'send'])
  expect(sent()[2]).toMatch(handoff)
  expect(sent()[2]).toContain('\nn1')
  expect(generations()).toEqual(['1:retired', '2:idle'])
})

test.each([
  ['injected before the prompt', ['ok'], ['open', 'inject', 'send'], 'injected'],
  ['sent inline when the app has no inject method', ['missing'], ['open', 'send'], 'inline'],
  ['retried on a new generation when injecting fails', ['error', 'ok'], ['open', 'close', 'open', 'inject', 'send'], 'injected'],
] as const)('a handoff to a native thread is %s', async (_, inject, expected, delivery) => {
  sand = await startSand([{ id: 'a', api: 'anthropic', models: ['m'], replies: [[said('a1')]] }, app([[said('n1')]], { inject: [...inject] })])
  const chat = sand.chat('a/m')

  await sand.turns.run(chat, 'one')
  sand.app.get(modelSettings)!.change(chat, { model: 'n/m' })
  await sand.turns.run(chat, 'two')

  expect(kinds()).toEqual([...expected])
  const injected = sand.native('n').find(call => call.type === 'inject')
  if (injected) expect(sent()).toEqual(['two'])
  else expect(sent()[0]).toMatch(handoff)
  expect(lastDelivery()).toBe(delivery)
})

test('a native thread whose step failed is uncertain, so the next turn starts a new generation', async () => {
  sand = await startSand([app([[said('n1')], [{ type: 'error', message: 'overloaded' }], [said('n3')]])])
  const chat = sand.chat('n/m')

  await sand.turns.run(chat, 'one')
  await expect(sand.turns.run(chat, 'two')).rejects.toThrow('overloaded')
  await sand.turns.run(chat, 'three')

  expect(kinds()).toEqual(['open', 'send', 'send', 'close', 'open', 'send'])
  expect(sent()[2]).toMatch(handoff)
  expect(generations()).toEqual(['1:retired', '2:idle'])
})

test('a chat moved to another folder starts a native thread there with a full handoff', async () => {
  sand = await startSand([app([[said('n1')], [said('n2')]])])
  const chat = sand.chat('n/m')
  const folder = mkdtempSync(join(tmpdir(), 'sand-moved-'))

  try {
    await sand.turns.run(chat, 'one')
    await sand.sessions.relocate(chat.id, { cwd: folder, project: null, note: 'Moved.' })
    await sand.turns.run(chat, 'two')
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }

  expect(sand.native('n').filter(call => call.type === 'open')).toEqual([
    { type: 'open', cwd: sand.home },
    { type: 'open', cwd: folder },
  ])
  expect(sent()[1]).toMatch(handoff)
  expect(generations()).toEqual(['1:retired', '2:idle'])
})

test('an interrupt keeps the native session, and the next turn is delivered into it', async () => {
  sand = await startSand([app([[said('half'), { type: 'hold' }], [said('n2')]])])
  const chat = sand.chat('n/m')
  const spoke = new Promise<void>(resolve => sand.app.on(llmEvent, event => void (event.type === 'text' && resolve())))

  const running = sand.turns.run(chat, 'one')
  await spoke
  sand.turns.interrupt(chat)
  await running
  await sand.turns.run(chat, 'two')

  expect(sand.native('n')).toEqual([
    { type: 'open', cwd: sand.home },
    { type: 'send', text: 'one' },
    { type: 'interrupt' },
    { type: 'send', text: 'two' },
  ])
  expect(generations()).toEqual(['1:idle'])
})
