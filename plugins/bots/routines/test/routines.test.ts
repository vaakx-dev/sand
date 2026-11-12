import { botOpen, botSend } from '@sand/bot-turns/contract'
import { routineDelete, routineList, routinePause } from '@sand/bot-routines/contract'
import { botCreate, botDelete, botList, type BotEntry } from '@sand/bots/contract'
import { type Message, textOf } from '@sand/chats/contract'
import { type Moment, notify } from '@sand/devices-notify/contract'
import { engine } from '@sand/engine/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { timestamp } from '@sand/util'
import { afterEach, expect, setSystemTime, test } from 'bun:test'

let sand: Sand

afterEach(async () => {
  await sand.stop()
  setSystemTime()
})

const said = (text: string) => ({ type: 'text', text }) as const
const at = (iso: string) => Date.parse(iso)

const start = async (replies: Source['replies']) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], {
    plugins: ['automation/schedules', 'agent/mcp-server', 'bots/bots', 'bots/turns', 'bots/routines'],
  })
  return sand
}

const until = async (done: () => Promise<boolean>) => {
  for (let tries = 0; tries < 500 && !(await done()); tries++) await Bun.sleep(10)
  expect(await done()).toBe(true)
}

const answered = async (bot: string, text: string) => {
  const found = (await sand.ask(botList, {})).find(listed => listed.id === bot)
  return found?.status === 'idle' && found.last?.text === text
}

const conversationOf = (id: string) => ({
  id,
  owner: 'bot' as const,
  cwd: '.',
  append() {
    throw new Error('tools here do not write to the conversation')
  },
  path: () => [],
  entries: () => [],
})

const runTool = async (name: string, input: Record<string, unknown>, conversation: string) => {
  const context = { cwd: '.', signal: new AbortController().signal, conversation: conversationOf(conversation), turn: 't', progress() {}, wait: () => () => {} }
  const result = await sand.app.get(tools)!.run({ type: 'tool_call', id: name, name, input }, context)
  return result.content.map(block => (block.type === 'text' ? block.text : '')).join('')
}

const userMessages = (entries: BotEntry[]) => entries.filter(entry => entry.type === 'message' && (entry.data as Message).role === 'user')

test('a bot sets a reminder, and when it is due the bot gets a routine turn in its own chat', async () => {
  setSystemTime(at('2026-11-04T17:58:00Z'))
  const reminder = { name: 'Call Ana', instructions: 'Remind the user to call Ana about lunch', at: '2026-11-04 18:00', zone: 'UTC' }
  const { ask, requests } = await start([[said('On it.'), { type: 'call', name: 'routine_create', input: reminder }], [said('I will remind you at 18:00.')], [said('Time to call Ana about lunch!')]])
  const bot = await ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })

  await ask(botSend, { bot: bot.id, prompt: 'Remind me at 6pm to call Ana', clientRequestId: 'one' })
  await until(() => answered(bot.id, 'I will remind you at 18:00.'))
  const [routine] = await ask(routineList, { bot: bot.id })
  expect(routine).toMatchObject({ bot: bot.id, name: 'Call Ana', when: { kind: 'once', at: at('2026-11-04T18:00:00Z') }, next: at('2026-11-04T18:00:00Z'), paused: false })
  expect(JSON.parse(requests('fake')[1]!).messages.at(-1).content[0].content[0].text).toContain('"name":"Call Ana"')

  const told: Moment[] = []
  sand.app.provide(notify, { send: async moment => void told.push(moment) })
  setSystemTime(at('2026-11-04T18:00:00Z'))
  await until(() => answered(bot.id, 'Time to call Ana about lunch!'))
  await until(async () => !(await ask(routineList, { bot: bot.id })).length)
  expect(told).toEqual([{ kind: 'routine', title: 'Call Ana', text: 'Time to call Ana about lunch!' }])

  const prompt = JSON.parse(requests('fake')[2]!).messages.at(-1).content[0].text
  expect(prompt).toStartWith(`<task-notification>\n<routine>${routine!.id}</routine>\n<kind>reminder</kind>\n<label>Call Ana</label>\n<status>due</status>`)
  expect(prompt).toContain(`<at>${timestamp(at('2026-11-04T18:00:00Z'))}</at>`)
  expect(prompt).toContain('<instructions>\nRemind the user to call Ana about lunch\n</instructions>')
  const { entries } = await ask(botOpen, { bot: bot.id })
  const fired = userMessages(entries).at(-1)!
  expect(textOf((fired.data as Message).content)).toBe(prompt)
  expect(sand.app.get(engine)!.turn('bot', fired.turn!)?.origin).toBe('routine')
})

test('routines can be paused, resumed and deleted, by any bot, and go when their bot does', async () => {
  setSystemTime(at('2026-11-04T08:00:00Z'))
  const { ask } = await start([])
  const bot = await ask(botCreate, { name: 'Briefer', models: { main: { model: 'fake/m' }, quick: {} } })
  const other = await ask(botCreate, { name: 'Other', models: { main: { model: 'fake/m' }, quick: {} } })
  const text = (name: string, input: Record<string, unknown>, conversation = bot.id) => runTool(name, input, conversation)

  expect(await text('routine_create', { name: 'Brief', instructions: 'Brief me', repeat: '0 9 * * 1-5', zone: 'UTC' })).toContain('repeats on cron 0 9 * * 1-5 (UTC)')
  expect(await text('routine_create', { name: 'Ping', instructions: 'Ping', repeat: '* * * * *', zone: 'UTC' }, other.id)).toContain('repeats on cron * * * * * (UTC)')
  expect(await text('routine_create', { name: 'Both', instructions: 'Ping', at: '2026-11-05 09:00', repeat: '0 9 * * *' })).toContain('exactly one of at, in_minutes or repeat')
  const [routine] = await ask(routineList, { bot: bot.id })
  expect(routine).toMatchObject({ name: 'Brief', next: at('2026-11-04T09:00:00Z') })
  expect(JSON.parse(await text('routine_list', {})).routines).toEqual([
    { id: routine!.id, bot: bot.id, name: 'Brief', when: 'repeats on cron 0 9 * * 1-5 (UTC)', next: expect.stringContaining('09:00'), instructions: 'Brief me' },
  ])
  expect(JSON.parse(await text('routine_pause', { id: routine!.id, paused: true }, other.id))).toMatchObject({ name: 'Brief', paused: true })

  expect(await ask(routinePause, { routine: routine!.id, paused: true })).toMatchObject({ paused: true })
  setSystemTime(at('2026-11-05T12:00:00Z'))
  expect(JSON.parse(await text('routine_pause', { id: routine!.id, paused: false }))).not.toHaveProperty('paused')
  expect(await ask(routineList, { bot: bot.id })).toMatchObject([{ paused: false, next: at('2026-11-06T09:00:00Z') }])

  await text('routine_create', { name: 'Later', instructions: 'Later', in_minutes: 90 })
  expect(await ask(routineDelete, { routine: routine!.id })).toBe(true)
  expect(await ask(routineList, { bot: bot.id })).toMatchObject([{ name: 'Later', when: { kind: 'once', at: at('2026-11-05T13:30:00Z') } }])
  await ask(botDelete, { bot: bot.id })
  expect(await ask(routineList, { bot: bot.id })).toEqual([])
})

test('a routine that fires while its bot is busy waits its turn, and that turn failing is kept as its last run', async () => {
  setSystemTime(at('2026-11-04T17:59:58Z'))
  const { ask } = await start([[said('Working.'), { type: 'call', name: 'gate', input: {} }], [said('Done.')], [{ type: 'error', message: 'overloaded' }]])
  const gate = Promise.withResolvers<string>()
  sand.tool('gate', () => gate.promise)
  const bot = await ask(botCreate, { name: 'Errands', models: { main: { model: 'fake/m' }, quick: {} } })
  await runTool('routine_create', { name: 'Call Ana', instructions: 'Remind the user to call Ana', at: '2026-11-04 18:00', zone: 'UTC' }, bot.id)
  await ask(botSend, { bot: bot.id, prompt: 'Do the long thing', clientRequestId: 'one' })

  setSystemTime(at('2026-11-04T18:00:00Z'))
  await Bun.sleep(1_500)
  expect(await ask(routineList, { bot: bot.id })).toMatchObject([{ name: 'Call Ana' }])

  gate.resolve('open')
  await until(async () => (await ask(routineList, { bot: bot.id }))[0]?.last?.outcome === 'failed')
  const [failed] = await ask(routineList, { bot: bot.id })
  expect(failed).toMatchObject({ name: 'Call Ana', paused: false, last: { outcome: 'failed' } })
  expect(failed?.next).toBeUndefined()
})
