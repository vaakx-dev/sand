import { calendarAgenda, calendarCreate, calendarList, calendarRemove, calendarUpdate, type Occurrence } from '@sand/calendar/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const zone = 'Europe/Berlin'

const start = async () => {
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar', 'calendar/local'] })
  return sand
}

const at = (time: string) => ({ time, zone })

const week = async (from = '2026-03-23T00:00:00Z', to = '2026-04-13T00:00:00Z') =>
  (await sand.ask(calendarAgenda, { from: Date.parse(from), to: Date.parse(to), zone })).map(({ title, start, original }: Occurrence) => [title, start, original])

test("sand's own calendar is there from the start and takes a repeating event", async () => {
  const { ask } = await start()
  const [own] = await ask(calendarList, {})
  expect(own).toMatchObject({ provider: 'sand', name: 'Calendar', primary: true, capabilities: ['read', 'write'] })

  const standup = await ask(calendarCreate, {
    event: { title: 'Standup', start: at('2026-03-23T09:00'), end: at('2026-03-23T09:15'), recurrence: { rule: 'FREQ=WEEKLY;BYDAY=MO' } },
  })
  expect(standup).toMatchObject({ calendar: own!.id, status: 'confirmed', start: at('2026-03-23T09:00:00') })
  expect(await week()).toEqual([
    ['Standup', at('2026-03-23T09:00:00'), at('2026-03-23T09:00:00')],
    ['Standup', at('2026-03-30T09:00:00'), at('2026-03-30T09:00:00')],
    ['Standup', at('2026-04-06T09:00:00'), at('2026-04-06T09:00:00')],
  ])
})

test('one occurrence, the following ones and the whole series can each be moved or deleted', async () => {
  const { ask } = await start()
  const standup = await ask(calendarCreate, {
    event: { title: 'Standup', start: at('2026-03-23T09:00'), end: at('2026-03-23T09:15'), recurrence: { rule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=4' } },
  })
  const target = (time: string) => ({ calendar: standup.calendar, id: standup.id, original: at(time) })

  await ask(calendarUpdate, { target: target('2026-03-30T09:00:00'), patch: { start: at('2026-03-31T10:00') }, scope: 'occurrence' })
  expect(await week()).toEqual([
    ['Standup', at('2026-03-23T09:00:00'), at('2026-03-23T09:00:00')],
    ['Standup', at('2026-03-31T10:00:00'), at('2026-03-30T09:00:00')],
    ['Standup', at('2026-04-06T09:00:00'), at('2026-04-06T09:00:00')],
  ])

  await ask(calendarUpdate, { target: target('2026-04-06T09:00:00'), patch: { title: 'Sync', start: at('2026-04-06T11:00') }, scope: 'following' })
  expect(await week('2026-03-23T00:00:00Z', '2026-04-20T00:00:00Z')).toEqual([
    ['Standup', at('2026-03-23T09:00:00'), at('2026-03-23T09:00:00')],
    ['Standup', at('2026-03-31T10:00:00'), at('2026-03-30T09:00:00')],
    ['Sync', at('2026-04-06T11:00:00'), at('2026-04-06T11:00:00')],
    ['Sync', at('2026-04-13T11:00:00'), at('2026-04-13T11:00:00')],
  ])

  await ask(calendarRemove, { target: target('2026-03-23T09:00:00'), scope: 'occurrence' })
  await ask(calendarUpdate, { target: target('2026-03-30T09:00:00'), patch: { start: at('2026-03-30T08:00') }, scope: 'series' })
  expect(await week()).toEqual([
    ['Standup', at('2026-03-30T08:00:00'), at('2026-03-30T08:00:00')],
    ['Sync', at('2026-04-06T11:00:00'), at('2026-04-06T11:00:00')],
  ])

  await ask(calendarRemove, { target: target('2026-03-30T08:00:00'), scope: 'following' })
  expect(await week()).toEqual([['Sync', at('2026-04-06T11:00:00'), at('2026-04-06T11:00:00')]])
})
