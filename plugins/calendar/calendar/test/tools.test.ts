import { botConversation, botCreate, botList, type BotEntry } from '@sand/bots/contract'
import { botSend } from '@sand/bot-turns/contract'
import { calendarAgenda, calendarCreate } from '@sand/calendar/contract'
import { textOf, type Message } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const zone = 'Europe/Berlin'

const start = async (replies: Source['replies'] = []) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], {
    plugins: ['calendar/calendar', 'calendar/local', 'bots/bots', 'bots/memory', 'bots/turns'],
  })
  return sand
}

const results = (entries: BotEntry[]) =>
  entries.flatMap(entry => (entry.type === 'message' ? (entry.data as Message).content.flatMap(block => (block.type === 'tool_result' ? [textOf(block.content)] : [])) : []))

const use = async (name: string, input: Record<string, unknown>) => {
  const session = sand.chat('fake/m')
  const result = await sand.app.get(tools)!.run(
    { type: 'tool_call', id: `${name}-call`, name, input },
    { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress() {}, wait: () => () => {} },
  )
  return { isError: Boolean(result.isError), text: textOf(result.content) }
}

test('a bot adds an event to the calendar and reads its agenda back', async () => {
  const { ask } = await start([
    [
      { type: 'call', name: 'calendar_create', input: { title: 'Lunch with Ana', start: '2026-11-13T13:00', zone, location: 'Café Luna' } },
      { type: 'call', name: 'calendar_agenda', input: { from: '2026-11-13', to: '2026-11-14' } },
    ],
    [{ type: 'text', text: 'Booked lunch with Ana.' }],
  ])
  const bot = await ask(botCreate, { name: 'Planner', job: 'Keep my calendar.', models: { main: { model: 'fake/m' }, quick: {} } })
  await ask(botSend, { bot: bot.id, prompt: 'Lunch with Ana next Friday at 1', clientRequestId: 'one' })
  for (let tries = 0; tries < 300 && (await ask(botList, {})).find(listed => listed.id === bot.id)?.last?.text !== 'Booked lunch with Ana.'; tries++) await Bun.sleep(10)

  const [lunch] = await ask(calendarAgenda, { from: Date.parse('2026-11-13T00:00Z'), to: Date.parse('2026-11-14T00:00Z'), zone })
  expect(lunch).toMatchObject({ title: 'Lunch with Ana', location: 'Café Luna', start: { time: '2026-11-13T13:00:00', zone }, end: { time: '2026-11-13T14:00:00', zone } })
  const [added, agenda] = results((await ask(botConversation, { bot: bot.id })).entries)
  expect(added).toMatch(/^Added "Lunch with Ana", Fri, 13 Nov 2026 \d\d:00–\d\d:00 \[id [\w-]+\]$/)
  expect(agenda).toContain(`Lunch with Ana (Café Luna) [id ${lunch!.id}]`)
})

test('a thread finds free time, moves one occurrence of a repeating event and deletes the rest', async () => {
  const { ask } = await start()
  const here = Temporal.Now.timeZoneId()
  const standup = await ask(calendarCreate, {
    event: { title: 'Standup', start: { time: '2026-11-09T09:00', zone: here }, end: { time: '2026-11-09T10:00', zone: here }, recurrence: { rule: 'FREQ=DAILY;COUNT=5' } },
  })

  expect(await use('calendar_free_time', { from: '2026-11-09', to: '2026-11-10', minutes: 60, day_start: '08:00', day_end: '12:00' })).toEqual({
    isError: false,
    text: `Free times in ${here}:\n- Mon, 9 Nov 2026 08:00–09:00\n- Mon, 9 Nov 2026 10:00–12:00`,
  })

  const moved = await use('calendar_update', { id: standup.id, occurrence: '2026-11-10T09:00:00', start: '2026-11-10T11:30' })
  expect(moved).toEqual({ isError: false, text: expect.stringMatching(/^Changed "Standup", Tue, 10 Nov 2026 11:30–12:30 \[id .+\]$/) })

  expect(await use('calendar_delete', { id: standup.id, occurrence: '2026-11-11T09:00:00', scope: 'following' })).toEqual({
    isError: false,
    text: 'Deleted "Standup" from this occurrence on',
  })
  const agenda = await use('calendar_agenda', { from: '2026-11-09', to: '2026-11-16' })
  expect(agenda.text.split('\n').filter(line => line.startsWith('- ')).map(line => line.slice(0, 19))).toEqual(['- 09:00–10:00 Stand', '- 11:30–12:30 Stand'])

  expect(await use('calendar_respond', { id: standup.id, response: 'accepted' })).toEqual({ isError: true, text: 'Standup is not an invitation' })
  expect(await use('calendar_update', { id: 'nope', title: 'x' })).toMatchObject({ isError: true, text: expect.stringContaining('No event with id nope') })
})
