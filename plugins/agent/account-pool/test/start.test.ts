import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const hour = 3_600_000

const session = (used: number, resetInMs: number) => [{ id: 'session', label: 'Session', used, resetInMs }]

const said = (text: string) => ({ type: 'text', text }) as const

const replies = () => [[said('Done.')], [said('Again.')]]

const sentTo = (source: string) => sand.native(source).flatMap(call => (call.type === 'send' ? [call.text] : []))

const ended = async (chat: Session, count: number) => {
  for (const end = Date.now() + 10_000; Date.now() < end; await Bun.sleep(20)) if (sand.turns.list(chat).length === count && !sand.turns.current(chat)) return
  throw new Error('The turn never ended')
}

test('a new chat starts on the plan account whose usage resets soonest and stays there', async () => {
  sand = await startSand(
    [
      { id: 'late', models: ['m'], limits: session(0.1, 5 * hour), replies: replies() },
      { id: 'soon', models: ['m'], limits: session(0.5, hour), replies: replies() },
      { id: 'spent', models: ['m'], limits: session(1, hour / 2), replies: replies() },
    ],
    { plugins: ['agent/account-pool'] },
  )
  await sand.llm.refreshLimits?.()
  const chat = sand.sessions.thread(sand.home)

  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)
  await sand.turns.send(chat, { prompt: 'Then', clientRequestId: 'two' })
  await ended(chat, 2)

  expect(sentTo('soon')).toEqual([expect.stringMatching(/Start$/), expect.stringMatching(/Then$/)])
  expect([...sentTo('late'), ...sentTo('spent')]).toEqual([])
})
