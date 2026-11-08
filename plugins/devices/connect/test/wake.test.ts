import { expect, test } from 'bun:test'
import { connected, connectTo, fakePc, waitFor } from './pc'

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

test('waking replaces a socket that went quiet while its PC still answers, without backing off', async () => {
  const pc = fakePc()
  const { connection, wake } = connectTo(pc)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)

  pc.sockets[0]!.silent = true
  const woke = Date.now()
  wake()

  expect(await waitFor(() => pc.sockets.length === 2 && connected(connection), 2000)).toBe(true)
  expect(Date.now() - woke).toBeLessThan(900)
  expect(connection.freshness().state).toBe('live')
})
