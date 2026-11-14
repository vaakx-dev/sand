import { startSand, type Sand } from '@sand/harness'
import { type Fire, type Schedule, schedules, type When } from '@sand/schedules/contract'
import { afterEach, expect, setSystemTime, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let sand: Sand | undefined
let home: string | undefined

afterEach(async () => {
  await sand?.stop()
  sand = undefined
  if (home) rmSync(home, { recursive: true, force: true })
  home = undefined
  setSystemTime()
})

const at = (iso: string) => Date.parse(iso)
const daily: When = { kind: 'cron', cron: '0 9 * * *', zone: 'UTC' }

const start = async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }], { ...(home && { home }), plugins: ['automation/schedules'] })
  return sand.app.get(schedules)!
}

const until = async (done: () => boolean) => {
  for (let tries = 0; tries < 500 && !done(); tries++) await Bun.sleep(10)
  expect(done()).toBe(true)
}

const handled = (service: Awaited<ReturnType<typeof start>>, run: (fire: Fire, schedule: Schedule) => void = () => {}) => {
  const fires: Fire[] = []
  service.handle('test', async (schedule, fire) => {
    fires.push(fire)
    run(fire, schedule)
  })
  return fires
}

test('a schedule lasts across a restart, and a run missed while sand was off runs once, late, or is skipped', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-schedules-'))
  setSystemTime(at('2026-11-06T08:00:00Z'))
  const before = await start()
  const caught = before.create({ owner: 'test', subject: 'a', when: daily, data: { say: 'hi' } })
  const skipped = before.create({ owner: 'test', subject: 'a', when: daily, missed: 'skip' })
  await sand!.stop()

  setSystemTime(at('2026-11-09T12:00:00Z'))
  const after = await start()
  const fires = handled(after)
  await until(() => after.get(skipped.id)?.last !== undefined && after.get(caught.id)?.last !== undefined)

  expect(fires).toEqual([{ key: `${caught.id}@${at('2026-11-06T09:00:00Z')}`, due: at('2026-11-06T09:00:00Z'), late: true, final: false }])
  expect(after.get(caught.id)).toMatchObject({ data: { say: 'hi' }, next: at('2026-11-10T09:00:00Z'), last: { outcome: 'ran' } })
  expect(after.get(skipped.id)).toMatchObject({ next: at('2026-11-10T09:00:00Z'), last: { outcome: 'missed' } })
})

test('a one-off runs at its time and is then gone', async () => {
  setSystemTime(at('2026-11-06T17:59:59Z'))
  const service = await start()
  const fires = handled(service)
  const once = service.create({ owner: 'test', subject: 'a', when: { kind: 'once', at: at('2026-11-06T18:00:00Z') } })
  await Bun.sleep(50)
  expect(fires).toEqual([])

  setSystemTime(at('2026-11-06T18:00:00Z'))
  await until(() => fires.length === 1)
  expect(fires[0]).toEqual({ key: `${once.id}@${at('2026-11-06T18:00:00Z')}`, due: at('2026-11-06T18:00:00Z'), late: false, final: false })
  await until(() => service.get(once.id) === undefined)
})

test('a failed run is tried again after growing gaps, across a restart, and a one-off that keeps failing stays with its error until tried again', async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-schedules-'))
  setSystemTime(at('2026-11-06T08:59:59Z'))
  const before = await start()
  const fires: Fire[] = []
  const failing = (fire: Fire) => {
    fires.push(fire)
    throw new Error('model unavailable')
  }
  before.handle('test', async (_, fire) => failing(fire))
  const once = before.create({ owner: 'test', subject: 'a', when: { kind: 'once', at: at('2026-11-06T09:00:00Z') } })
  const often = before.create({ owner: 'test', subject: 'a', when: { kind: 'cron', cron: '* * * * *', zone: 'UTC' } })
  setSystemTime(at('2026-11-06T09:00:00Z'))
  await until(() => before.get(once.id)?.last !== undefined && before.get(often.id)?.last !== undefined)
  expect(before.get(once.id)).toMatchObject({ next: at('2026-11-06T09:01:00Z'), last: { outcome: 'failed', error: 'model unavailable' } })
  expect(before.get(often.id)).toMatchObject({ next: at('2026-11-06T09:01:00Z'), last: { outcome: 'failed', error: 'model unavailable' } })
  await sand!.stop()

  const after = await start()
  after.handle('test', async (schedule, fire) => (schedule.id === once.id ? failing(fire) : undefined))
  for (const iso of ['2026-11-06T09:01:00Z', '2026-11-06T09:06:00Z', '2026-11-06T09:21:00Z']) {
    setSystemTime(at(iso))
    await until(() => after.get(once.id)?.last?.at === at(iso))
  }

  const due = at('2026-11-06T09:00:00Z')
  expect(fires.filter(fire => fire.key.startsWith(once.id))).toEqual([
    { key: `${once.id}@${due}`, due, late: false, final: false },
    { key: `${once.id}@${due}#1`, due, late: false, final: false },
    { key: `${once.id}@${due}#2`, due, late: true, final: false },
    { key: `${once.id}@${due}#3`, due, late: true, final: true },
  ])
  expect(fires.filter(fire => fire.key.startsWith(often.id))).toEqual([{ key: `${often.id}@${due}`, due, late: false, final: true }])
  const failed = after.get(once.id)
  expect(failed).toMatchObject({ paused: false, last: { outcome: 'failed', error: 'model unavailable' } })
  expect(failed?.next).toBeUndefined()
  expect(after.pause(once.id, false).next).toBeUndefined()

  setSystemTime(at('2026-11-06T10:00:00Z'))
  expect(after.retry(once.id).next).toBe(at('2026-11-06T10:00:00Z'))
  await until(() => after.get(once.id)?.last?.at === at('2026-11-06T10:00:00Z'))
  expect(fires.at(-1)).toEqual({ key: `${once.id}@${due}#4`, due, late: true, final: true })
  expect(after.get(once.id)?.next).toBeUndefined()
  expect(() => after.retry(often.id)).toThrow('It has not failed')
})

test('schedules in the past, or that never come due are refused, and any number may run every minute', async () => {
  setSystemTime(at('2026-11-06T08:00:00Z'))
  const service = await start()
  const create = (when: When) => service.create({ owner: 'test', subject: 'a', when })

  expect(() => create({ kind: 'cron', cron: '0 9 * * *', zone: 'Nowhere/Land' })).toThrow('not a time zone')
  expect(() => create({ kind: 'cron', cron: '0 0 31 2 *', zone: 'UTC' })).toThrow('never comes due')
  expect(() => create({ kind: 'once', at: at('2026-11-06T07:00:00Z') })).toThrow('already passed')

  for (let count = 0; count < 30; count++) create({ kind: 'cron', cron: '* * * * *', zone: 'UTC' })
  expect(service.list('test', 'a')).toHaveLength(30)
})
