import { expect, test } from 'bun:test'
import { connected, connectTo, fakePc, waitFor } from './pc'

const tailnet = 'https://desk.example.ts.net'

test('waking keeps a socket that still answers', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  wake()
  expect(connection.freshness().state).toBe('checking')
  expect(await waitFor(() => connection.freshness().state === 'live', 200)).toBe(true)
  await Bun.sleep(800)

  expect(pc.sockets).toHaveLength(1)
  expect(connected(connection)).toBe(true)
})

test('waking replaces a socket that went quiet within a moment, without backing off', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc, [tailnet], false)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  pc.sockets[0]!.silent = true
  const woke = Date.now()
  wake()

  expect(await waitFor(() => pc.sockets.length === 2 && connection.freshness().state === 'live', 2000)).toBe(true)
  expect(Date.now() - woke).toBeLessThan(900)
  expect(connected(connection)).toBe(true)
})

test('waking while a dial hangs dials again at once instead of waiting it out', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc, [tailnet], false)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  pc.answers.set(tailnet, 'hang')
  pc.sockets[0]!.drop('the phone slept')
  await Bun.sleep(1200)
  pc.answers.set(tailnet, 'up')
  const woke = Date.now()
  wake()

  expect(await waitFor(() => connected(connection), 2000)).toBe(true)
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
  expect(await waitFor(failedTwice, 4000)).toBe(true)

  pc.answers.set(tailnet, 'up')
  wake()

  expect(connection.status()).toMatchObject({ phase: 'connecting', attempt: 1 })
  expect(await waitFor(() => connected(connection), 300)).toBe(true)
})
