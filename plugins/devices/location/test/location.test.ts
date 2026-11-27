import { textOf } from '@sand/chats/contract'
import { type JoinKind, registry } from '@sand/devices-contract'
import { type Sand, startHost, startSand, type TestHost } from '@sand/harness'
import { hostOptions } from '@sand/host-daemon/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Fix, locationAnswer, locationAsk, locationSettled } from '../src/contract'

const WAIT_MS = 2_000
const PHONE_GRACE_MS = 500

const TOWER: Fix = { latitude: 48.8583701, longitude: 2.2944813, accuracyMeters: 4.6 }
const DESK: Fix = { latitude: 48.8606111, longitude: 2.337644, accuracyMeters: 1200 }

let home: string
let host: TestHost
let sand: Sand

afterEach(async () => {
  await sand.stop()
  await host.stop()
  rmSync(home, { recursive: true, force: true })
})

const start = async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-location-'))
  host = await startHost(home, ['devices/registry', 'devices/location'], app =>
    app.provide(hostOptions, { home, main: '', port: 0, watch: false, drainTimeout: 0 }),
  )
  sand = await startSand([{ id: 'replay', models: ['m'], replies: [], api: 'anthropic' }], {
    home,
    host,
    plugins: ['devices/location'],
    options: { location: { wait_ms: WAIT_MS, phone_grace_ms: PHONE_GRACE_MS } },
  })
  const thread = sand.chat('replay/m')
  const pair = async (kind: JoinKind, name: string) => {
    const { id } = await host.app.get(registry)!.add({ kind, name, publicKey: `${name}-key` }, 'test')
    return (ask: string, fix: Fix) => sand.askAs({ device: id, kind })(locationAnswer, { id: ask, fix })
  }
  const locate = async () => {
    const asked = sand.heard(locationAsk)
    const call = { type: 'tool_call', id: `location-${Bun.randomUUIDv7()}`, name: 'location', input: {} } as const
    const started = performance.now()
    const result = sand
      .app.get(tools)!
      .run(call, { cwd: thread.cwd, signal: new AbortController().signal, conversation: thread, turn: 'test', progress() {}, wait: () => () => {} })
      .then(done => ({ text: textOf(done.content), ms: performance.now() - started }))
    return { id: (await asked).id, result }
  }
  return { pair, locate }
}

test("a phone's fix comes back at once, named from the device list, and the ask is settled for every client", async () => {
  const { pair, locate } = await start()
  const phone = await pair('phone', 'Pocket')
  const { id, result } = await locate()
  const settled = sand.heard(locationSettled)

  await phone(id, TOWER)

  const { text, ms } = await result
  expect(text).toBe('Location from Pocket (phone): latitude 48.8583701, longitude 2.2944813, accurate to 5 m.')
  expect(ms).toBeLessThan(PHONE_GRACE_MS)
  expect(await settled).toEqual({ id })
})

test('a phone answering within the grace window wins over a browser that answered first', async () => {
  const { pair, locate } = await start()
  const [phone, browser] = await Promise.all([pair('phone', 'Pocket'), pair('browser', 'Desk')])
  const { id, result } = await locate()

  await browser(id, DESK)
  await Bun.sleep(PHONE_GRACE_MS / 5)
  await phone(id, TOWER)

  expect((await result).text).toStartWith('Location from Pocket (phone): latitude 48.8583701')
})

test("with no phone answering, a browser's fix is used once the grace window ends", async () => {
  const { pair, locate } = await start()
  const browser = await pair('browser', 'Desk')
  const { id, result } = await locate()

  await browser(id, DESK)

  const { text, ms } = await result
  expect(text).toBe('Location from Desk (browser): latitude 48.8606111, longitude 2.337644, accurate to 1200 m.')
  expect(ms).toBeGreaterThanOrEqual(PHONE_GRACE_MS)
  expect(ms).toBeLessThan(WAIT_MS)
})

test('with no answer the tool says the location is unavailable, and answers to a settled or unknown ask change nothing', async () => {
  const { pair, locate } = await start()
  const phone = await pair('phone', 'Pocket')
  const first = await locate()

  const { text, ms } = await first.result
  expect(text).toStartWith('Location unavailable: no phone or browser running sand shared a location within 2 seconds.')
  expect(ms).toBeGreaterThanOrEqual(WAIT_MS)

  const second = await locate()
  await phone(first.id, DESK)
  await phone('unknown-ask', DESK)
  await phone(second.id, TOWER)
  expect((await second.result).text).toStartWith('Location from Pocket (phone): latitude 48.8583701')
})
