import { until } from '@sand/harness/until'
import { expect, test } from 'bun:test'
import { wakeGrace } from '../src/timing'
import { connected, connectTo, fakePc } from './pc'

const tailnet = 'https://desk.example.ts.net'

test('waking keeps a socket that still answers, and tells listeners once it does', async () => {
  const pc = fakePc()
  const { connection, wake, shown } = connectTo(pc)
  await until(() => connected(connection))

  wake()
  expect(connection.freshness().state).toBe('checking')
  await until(() => connection.freshness().state === 'live')

  expect(shown()).toBe('live')
  expect(pc.sockets).toHaveLength(1)
  expect(connected(connection)).toBe(true)
})

test('waking replaces a socket that went quiet within a moment, without backing off', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc, [tailnet], false)
  await until(() => connected(connection))

  pc.sockets[0]!.silent = true
  const woke = Date.now()
  wake()

  await until(() => pc.sockets.length === 2 && connection.freshness().state === 'live')
  expect(Date.now() - woke).toBeLessThan(900)
  expect(connected(connection)).toBe(true)
})

test('waking while a dial hangs dials again at once instead of waiting it out', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc, [tailnet], false)
  await until(() => connected(connection))

  pc.answers.set(tailnet, 'hang')
  pc.sockets[0]!.drop('the phone slept')
  await until(() => connection.status().phase === 'connecting')
  await Bun.sleep(wakeGrace + 1)
  pc.answers.set(tailnet, 'up')
  const woke = Date.now()
  wake()

  await until(() => connected(connection))
  expect(Date.now() - woke).toBeLessThan(300)
})

test('waking after failed tries starts over from the first attempt', async () => {
  const pc = fakePc()
  pc.answers.set(tailnet, 'down')
  const { connection, wake } = connectTo(pc, [tailnet], false)
  const failedTwice = () => {
    const status = connection.status()
    return status.phase === 'reconnecting' && status.attempt >= 2
  }
  await until(failedTwice)

  pc.answers.set(tailnet, 'up')
  wake()

  expect(connection.status()).toMatchObject({ phase: 'connecting', attempt: 1 })
  await until(() => connected(connection), { timeoutMs: 300 })
})
