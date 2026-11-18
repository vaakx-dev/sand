import { botCreate } from '@sand/bots/contract'
import type { Session } from '@sand/chats/contract'
import { startSand, type Sand, type SandOptions } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Reply } from '@sand/replay/contract'
import { removeFolder } from '@sand/util/fs'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resumeAlternative, resumeCancel, resumeSwitch } from '../src/contract'

let sand: Sand
const homes: string[] = []

afterEach(async () => {
  await sand.stop()
  await Promise.all(homes.splice(0).map(removeFolder))
})

const said = (text: string) => ({ type: 'text', text }) as const

const limit = (resetInMs?: number) => ({ type: 'limit', ...(resetInMs && { resetInMs }) }) as const

const continued = expect.stringContaining('Continue where you left off')

const then = expect.stringMatching(/And this$/)

const start = (replies: Reply[], options: SandOptions = {}) =>
  startSand([{ id: 'fake', models: ['m'], replies }], { ...options, plugins: ['automation/schedules', 'agent/usage-resume', ...(options.plugins ?? [])] })

const sent = () => sand.native('fake').flatMap(call => (call.type === 'send' ? [call.text] : []))

const until = async <T>(found: () => T | undefined | Promise<T | undefined>, wait = 10_000) => {
  for (const end = Date.now() + wait; Date.now() < end; await Bun.sleep(20)) {
    const value = await found()
    if (value) return value
  }
  throw new Error('It never happened')
}

const ended = (chat: Session, count: number) =>
  until(() => {
    const turns = sand.turns.list(chat)
    return turns.length === count && !sand.turns.current(chat) ? turns : undefined
  })

test('a chat out of usage keeps what is sent meanwhile, continues at the reset, then sends it', async () => {
  sand = await start([[said('Half'), limit(1_500)], [said('Picked up.')], [said('Answered.')]])
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  const [stopped] = await ended(chat, 1)
  expect(stopped).toMatchObject({ status: 'failed', stopReason: 'limited' })
  expect(chat.path().find(entry => entry.type === 'turn-ending')?.data).toMatchObject({ stopReason: 'limited', resetsAt: expect.any(Number) })

  expect(await sand.turns.send(chat, { prompt: 'And this', clientRequestId: 'two' })).toMatchObject({ disposition: 'queued' })
  expect(sent()).toEqual(['Start'])

  await ended(chat, 3)
  expect(sent()).toEqual(['Start', continued, 'And this'])
})

test('cancelling a chat’s resume keeps what waits until the reset, then sends it without continuing', async () => {
  sand = await start([[said('Half'), limit(2_500)], [said('Answered.')]])
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  const [stopped] = await ended(chat, 1)
  await sand.turns.send(chat, { prompt: 'And this', clientRequestId: 'two' })

  await sand.ask(resumeCancel, { turn: stopped!.id })
  await Bun.sleep(1_000)
  expect(sent()).toEqual(['Start'])

  await ended(chat, 2)
  expect(sent()).toEqual(['Start', then])
})

test('after cancelling, the owner sending again lets what waited go out first', async () => {
  sand = await start([[said('Half'), limit(60_000)], [said('Answered.')], [said('Done.')]])
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  const [stopped] = await ended(chat, 1)
  await sand.turns.send(chat, { prompt: 'And this', clientRequestId: 'two' })
  await sand.ask(resumeCancel, { turn: stopped!.id })

  await sand.turns.send(chat, { prompt: 'Try now', clientRequestId: 'three' })
  await ended(chat, 3)
  expect(sent()).toEqual(['Start', then, 'Try now'])
})

test('without a reset time a chat does not wait or resume', async () => {
  sand = await start([[said('Half'), limit()], [said('Answered.')]])
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)

  expect(await sand.turns.send(chat, { prompt: 'And this', clientRequestId: 'two' })).toMatchObject({ disposition: 'started' })
  await ended(chat, 2)
  expect(sent()).toEqual(['Start', then])
})

test('a resume planned before sand restarts still happens at the reset', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-resume-'))
  homes.push(home)
  sand = await start([[limit(2_500)]], { home })
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)
  await sand.stop()

  sand = await start([[said('Picked up.')]], { home })
  await ended(sand.sessions.open(chat.id)!, 2)
  expect(sent()).toEqual([continued])
})

test('a bot out of usage continues at the reset', async () => {
  sand = await start([[limit(1_500)], [said('Picked up.')]], { plugins: ['bots/bots', 'bots/turns'] })
  const bot = await sand.ask(botCreate, { name: 'Errands' })
  const chat = sand.sessions.require(bot.id)
  sand.app.get(modelSettings)!.change(chat, { model: 'fake/m' })
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })

  await ended(chat, 2)
  expect(sent()).toEqual(['Start', continued])
})

const sentTo = (source: string) => sand.native(source).flatMap(call => (call.type === 'send' ? [call.text] : []))

test('a thread out of usage carries on at once on another account of its plan', async () => {
  sand = await startSand(
    [
      { id: 'fake', label: 'Fake Plan', models: ['m'], replies: [[said('Half'), limit(60_000)]] },
      { id: 'other', of: 'fake', label: 'Fake Plan 2', models: ['m'], replies: [[said('Picked up elsewhere.')], [said('Answered.')]] },
    ],
    { plugins: ['automation/schedules', 'agent/usage-resume', 'agent/account-pool'] },
  )
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 2)
  expect(sentTo('other')).toEqual([expect.stringContaining('Moved to another account')])

  await sand.turns.send(chat, { prompt: 'And this', clientRequestId: 'two' })
  await ended(chat, 3)
  expect(sentTo('other')).toEqual([expect.stringContaining('Moved to another account'), then])
})

test('a thread out of usage can switch to another model on another account and continue there at once', async () => {
  sand = await startSand(
    [
      { id: 'fake', label: 'Fake Plan', models: ['m'], replies: [[said('Half'), limit(60_000)]] },
      { id: 'other', label: 'Other Plan', models: ['n'], replies: [[said('Picked up elsewhere.')]] },
    ],
    { plugins: ['automation/schedules', 'agent/usage-resume'] },
  )
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  const [stopped] = await ended(chat, 1)

  const offered = await sand.ask(resumeAlternative, { turn: stopped!.id })
  expect(offered).toEqual({ model: 'other/n', label: 'n', account: 'Other Plan' })
  await sand.ask(resumeSwitch, { turn: stopped!.id, model: 'other/n' })

  await ended(chat, 2)
  expect(sentTo('other')).toEqual([expect.stringContaining('Switched to Other Plan')])
  expect(await sand.ask(resumeAlternative, { turn: stopped!.id })).toBeUndefined()
})

test('with every plan account out, a chat resumes once at the earliest reset among them, on the account that resets', async () => {
  sand = await startSand(
    [
      { id: 'fake', label: 'Fake Plan', models: ['m'], replies: [[said('Half'), limit(60_000)]] },
      { id: 'other', of: 'fake', label: 'Fake Plan 2', models: ['m'], limits: [{ id: 'session', label: '5-hour', used: 1, resetInMs: 1_500 }], replies: [[said('Picked up.')]] },
    ],
    { plugins: ['automation/schedules', 'agent/usage-resume', 'agent/account-pool'] },
  )
  await sand.llm.refreshLimits?.()
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'Start', clientRequestId: 'one' })
  await ended(chat, 1)
  expect(sentTo('other')).toEqual([])

  await ended(chat, 2)
  expect(sentTo('other')).toEqual([continued])
  expect(sent()).toEqual([expect.stringMatching(/Start$/)])
})
