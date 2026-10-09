import { errorMessage } from '@sand/kit'
import type { DeviceInfo, HostDevices, RemoteRecord } from '@sand/protocol'
import type { RemoteStore } from '../store'
import { callLink, type LinkReply } from './call'
import type { Status } from './status'

export interface CheckOptions {
  self: DeviceInfo
  urls(): string[]
  store: RemoteStore
  devices: Pick<HostDevices, 'mint'>
  status: Status
  renamed(): void
}

const refusedText = (name: string) => `${name} no longer accepts this PC — pair it again`

export const createChecks = ({ self, urls, store, devices, status, renamed }: CheckOptions) => {
  let running: Promise<void> | undefined
  let last = 0

  const learn = async (id: string, peer: DeviceInfo) => {
    const record = store.get(id)
    if (!record || (peer.name === record.name && (!peer.platform || peer.platform === record.platform))) return
    await store.put({ ...record, name: peer.name || record.name, platform: peer.platform || record.platform })
    renamed()
  }

  const settle = async (record: RemoteRecord, reply: LinkReply) => {
    if (reply.kind === 'refused') return status.refuse(record.id, refusedText(record.name))
    status.reached(record.id, reply.url)
    if (reply.kind === 'linked') await learn(record.id, reply.result.device)
  }

  const check = async (record: RemoteRecord) => {
    try {
      let reply = await callLink(record, { device: self, urls: urls() })
      if (reply.kind === 'linked' && !reply.result.accepts) {
        const key = await devices.mint({ id: record.id, name: reply.result.device.name || record.name, platform: reply.result.device.platform })
        reply = await callLink(record, { device: self, urls: urls(), key })
      }
      await settle(record, reply)
    } catch (error) {
      status.lost(record.id, `${record.name} is not reachable: ${errorMessage(error)}`)
    }
  }

  const round = () => {
    last = Date.now()
    running ??= Promise.all(store.list().map(check))
      .then(() => undefined)
      .finally(() => (running = undefined))
    return running
  }

  return {
    round,
    one: (id: string) => {
      const record = store.get(id)
      return record ? check(record) : Promise.resolve()
    },
    stale: (age: number) => Date.now() - last > age,
  }
}

export type Checks = ReturnType<typeof createChecks>
