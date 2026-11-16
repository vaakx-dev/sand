import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { loginAdd, loginLogout, loginRename } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => [{ type: 'text', text }] as const

const until = async <T>(found: () => T | undefined, wait = 10_000) => {
  for (const end = Date.now() + wait; Date.now() < end; await Bun.sleep(20)) {
    const value = found()
    if (value) return value
  }
  throw new Error('It never happened')
}

const ended = (chat: Session, count: number) => until(() => sand.turns.list(chat).length === count && !sand.turns.current(chat))

const sentTo = (source: string) => sand.native(source).flatMap(call => (call.type === 'send' ? [call.text] : []))

test('an added account runs beside the plan’s own under its own name, and its threads carry on with the plan’s own once it is removed', async () => {
  sand = await startSand([{ id: 'fake', label: 'Fake Plan', models: ['m'], replies: [[...said('Mine.')], [...said('Carried on.')]] }])
  const added = await sand.ask(loginAdd, { account: 'fake' })
  await until(() => sand.llm.find?.(`${added}/m`)?.source === added)
  const listed = (await sand.ask(loginRename, { account: added, name: 'Spare' })).accounts.map(({ id, label, signedIn }) => ({ id, label, signedIn }))
  expect(listed).toContainEqual({ id: 'fake', label: 'Fake Plan', signedIn: true })
  expect(listed).toContainEqual({ id: added, label: 'Spare', signedIn: true })

  const chat = sand.chat(`${added}/m`)
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)
  expect(sentTo(added)).toEqual(['Start'])

  await sand.ask(loginLogout, { account: added })
  await sand.turns.send(chat, { prompt: 'Again', clientRequestId: 'two' })
  await ended(chat, 2)
  expect(sentTo('fake')).toEqual([expect.stringMatching(/Again$/)])
  expect(sand.turns.list(chat).map(turn => turn.status)).toEqual(['completed', 'completed'])
})
