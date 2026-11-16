import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const hour = 3_600_000

const week = (used: number, resetInMs: number) => [{ id: 'week', label: 'Week', used, resetInMs, durationMs: 7 * 24 * hour }]

const said = (text: string) => ({ type: 'text', text }) as const

const replies = () => [[said('Done.')], [said('Again.')]]

const sentTo = (source: string) => sand.native(source).flatMap(call => (call.type === 'send' ? [call.text] : []))

const ended = async (chat: Session, count: number) => {
  for (const end = Date.now() + 10_000; Date.now() < end; await Bun.sleep(20)) if (sand.turns.list(chat).length === count && !sand.turns.current(chat)) return
  throw new Error('The turn never ended')
}

const pool = () =>
  startSand(
    [
      { id: 'plan', label: 'Plan', models: ['m'], limits: week(0.1, 100 * hour), replies: replies() },
      { id: 'plan-soon', of: 'plan', label: 'Plan 2', models: ['m'], limits: week(0.5, 20 * hour), replies: replies() },
      { id: 'plan-spent', of: 'plan', label: 'Plan 3', models: ['m'], limits: week(1, 10 * hour), replies: replies() },
    ],
    { plugins: ['agent/account-pool'] },
  )

test('a plan with several accounts is one model, and a chat on it runs on the account to spend first and stays there', async () => {
  sand = await pool()
  await sand.llm.refreshLimits?.()
  expect(sand.llm.models?.().map(model => model.id)).toEqual(['plan/m'])

  const chat = sand.sessions.thread(sand.home)
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)
  await sand.turns.send(chat, { prompt: 'Then', clientRequestId: 'two' })
  await ended(chat, 2)

  expect(sentTo('plan-soon')).toEqual([expect.stringMatching(/Start$/), expect.stringMatching(/Then$/)])
  expect([...sentTo('plan'), ...sentTo('plan-spent')]).toEqual([])
})

test('a chat that saved the model of one account runs on the plan, past that account being out', async () => {
  sand = await pool()
  await sand.llm.refreshLimits?.()
  const saved = sand.chat('plan-spent/m')

  await sand.turns.send(saved, { prompt: 'Old', clientRequestId: 'old' })
  await ended(saved, 1)

  expect(sand.turns.list(saved)[0]?.selection).toMatchObject({ model: 'plan/m', source: 'plan-soon' })
  expect(sentTo('plan-soon')).toEqual([expect.stringMatching(/Old$/)])
})
