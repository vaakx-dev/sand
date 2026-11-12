import { type DeviceRecord, devicesRename, type Peers } from '@sand/devices-contract'
import { type Caller, createHandlers } from '@sand/host-hub/contract'
import { expect, test } from 'bun:test'
import { createRegistry } from '../src/registry'
import { deviceRequests } from '../src/requests'

const phone: Caller = { device: 'phone', kind: 'phone' }

const pc = async (here: string, online: () => string[]) => {
  const registry = createRegistry({ saved: [] as DeviceRecord[], save: async () => {} })
  const hub = createHandlers()
  const forwarded: string[] = []
  const linked = (): Pick<Peers, 'connected' | 'call'> => ({
    connected: online,
    call: (device, request, input) => {
      forwarded.push(device)
      return laptop.hub.ask(request, input, { device: here, kind: 'pc' })
    },
  })
  for (const register of deviceRequests({ hub, registry, here, linked })) register()
  return { hub, registry, forwarded }
}

const records = [
  { kind: 'pc', name: 'Desk', platform: 'linux', publicKey: 'desk-key' },
  { kind: 'pc', name: 'Laptop', platform: 'darwin', publicKey: 'laptop-key' },
] as const

let laptop: Awaited<ReturnType<typeof pc>>

const pair = async (online: boolean) => {
  let ids: string[] = []
  const desk = await pc('desk', () => (online ? ids.slice(1) : []))
  laptop = await pc('laptop', () => [])
  for (const side of [desk, laptop]) ids = await Promise.all(records.map(async record => (await side.registry.add(record, 'phone')).id))
  return { desk, ids }
}

test('renaming a PC that is online has that PC rename itself; offline, the record here is renamed', async () => {
  const online = await pair(true)
  const [, laptopId = ''] = online.ids
  expect((await online.desk.hub.ask(devicesRename, { device: laptopId, name: 'Studio' }, phone)).name).toBe('Studio')
  expect(online.desk.forwarded).toEqual([laptopId])
  expect(laptop.registry.get(laptopId)?.name).toBe('Studio')

  const offline = await pair(false)
  await offline.desk.hub.ask(devicesRename, { device: laptopId, name: 'Studio' }, phone)
  expect(offline.desk.forwarded).toEqual([])
  expect(offline.desk.registry.get(laptopId)?.name).toBe('Studio')
  expect(laptop.registry.get(laptopId)?.name).toBe('Laptop')
})
