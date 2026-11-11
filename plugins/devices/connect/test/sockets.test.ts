import { devicePaths } from '@sand/devices-contract'
import { expect, test } from 'bun:test'
import { aDevice, connected, connectTo, fakePc, waitFor } from './pc'

const wifi = 'http://192.168.0.2:4317'

const connectAndLeave = async (pc: ReturnType<typeof fakePc>, device: ReturnType<typeof aDevice>) => {
  const { connection } = connectTo(pc, [wifi], false, device)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)
  connection.close()
}

test('a PC that takes signed sockets is reached without a ticket, and the next connection skips the identity check', async () => {
  const pc = fakePc()
  const device = aDevice()
  await connectAndLeave(pc, device)

  const { connection } = connectTo(pc, [wifi], false, device)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)
  expect(pc.asked).not.toContain(devicePaths.ticket)
  expect(pc.probed).toEqual([wifi])
})

test('a saved nonce the PC no longer knows falls back to the identity check', async () => {
  const pc = fakePc()
  const device = aDevice()
  await connectAndLeave(pc, device)
  pc.restart()

  const { connection } = connectTo(pc, [wifi], false, device)
  expect(await waitFor(() => connected(connection), 2000)).toBe(true)
  expect(pc.probed).toEqual([wifi, wifi])
})

test("a resumed socket whose PC can't prove its key is dropped and the PC is checked again", async () => {
  const pc = fakePc()
  const device = aDevice()
  await connectAndLeave(pc, device)
  pc.pc.forged = true

  const { connection } = connectTo(pc, [wifi], false, device)
  expect(await waitFor(() => connection.status().phase === 'blocked', 2000)).toBe(true)
  expect(connection.status()).toMatchObject({ phase: 'blocked', reason: 'wrong-pc' })
  expect(pc.probed).toEqual([wifi, wifi])
})

test('a device the PC removed learns it from a refused signed socket', async () => {
  const pc = fakePc()
  pc.pc.removed = true
  const { connection } = connectTo(pc, [wifi], false)

  expect(await waitFor(() => connection.status().phase === 'blocked', 2000)).toBe(true)
  expect(connection.status()).toMatchObject({ phase: 'blocked', reason: 'removed', by: 'Desk' })
})
