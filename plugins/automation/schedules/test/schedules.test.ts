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

  expect(fires).toEqual([{ key: `${caught.id}@${at('2026-11-06T09:00:00Z')}`, due: at('2026-11-06T09:00:00Z'), late: true }])
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
  expect(fires[0]).toEqual({ key: `${once.id}@${at('2026-11-06T18:00:00Z')}`, due: at('2026-11-06T18:00:00Z'), late: false })
  await until(() => service.get(once.id) === undefined)
})

test('a failed one-off stays with its error and runs again when resumed, and a failing schedule keeps running', async () => {
  setSystemTime(at('2026-11-06T08:59:59Z'))
  const service = await start()
  handled(service, () => {
    throw new Error('no model picked')
  })
  const once = service.create({ owner: 'test', subject: 'a', when: { kind: 'once', at: at('2026-11-06T09:00:00Z') } })
  const often = service.create({ owner: 'test', subject: 'a', when: { kind: 'cron', cron: '* * * * *', zone: 'UTC' } })
  for (const iso of ['2026-11-06T09:00:00Z', '2026-11-06T09:01:00Z', '2026-11-06T09:02:00Z', '2026-11-06T09:03:00Z']) {
    setSystemTime(at(iso))
    await until(() => service.get(often.id)?.last?.at === at(iso))
  }

  expect(service.get(often.id)).toMatchObject({ paused: false, next: at('2026-11-06T09:04:00Z'), last: { outcome: 'failed', error: 'no model picked' } })
  const failed = service.get(once.id)
  expect(failed).toMatchObject({ paused: false, last: { outcome: 'failed', error: 'no model picked' } })
  expect(failed?.next).toBeUndefined()
  expect(service.pause(once.id, false)).toMatchObject({ next: at('2026-11-06T09:03:00Z') })
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
