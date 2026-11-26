import { until } from '@sand/harness/until'
import { expect, test } from 'bun:test'
import { connected, connectTo, fakePc } from './pc'

const loopback = 'http://127.0.0.1:4999'
const wifi = 'http://192.168.0.2:4317'
const tailnet = 'https://desk.example.ts.net'

test("a device that isn't the PC never dials the PC's loopback address", async () => {
  const pc = fakePc()
  const { connection } = connectTo(pc, [loopback, wifi], false)
  await until(() => connected(connection))

  expect(pc.probed).not.toContain(loopback)
  expect(connection.diagnosis().routes.map(entry => entry.route.key)).toEqual([wifi])
})

test('the first route that answers is used without waiting on a better one', async () => {
  const pc = fakePc()
  pc.answers.set(wifi, 'hang')
  const started = Date.now()
  const { connection } = connectTo(pc, [wifi, tailnet], false)

  await until(() => connected(connection))
  expect(Date.now() - started).toBeLessThan(300)
  const status = connection.status()
  expect(status.phase === 'connected' && status.route.key).toBe(tailnet)
})

test('a PC that comes back after a restart is reconnected at once, without backing off', async () => {
  const pc = fakePc()
  const { connection } = connectTo(pc, [wifi], false)
  await until(() => connected(connection))

  pc.answers.set(wifi, 'down')
  pc.sockets[0]!.drop('server restarting')
  await until(() => {
    const status = connection.status()
    return status.phase === 'reconnecting' && status.attempt >= 2
  })
  pc.answers.set(wifi, 'up')
  const back = Date.now()

  await until(() => connected(connection))
  expect(Date.now() - back).toBeLessThan(700)
})
