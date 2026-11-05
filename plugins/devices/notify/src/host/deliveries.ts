import type { DeviceRecord, DevicePush, Peers, Registry, ThisPc } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { type Notice, notifyDeliver } from '../contract'
import { sendPush } from './push'
import type { Vapid } from './vapid'

export interface DeliveryDeps {
  registry: Registry
  thisPc: ThisPc
  peers: Peers
  vapid: Vapid
  report(error: unknown): void
}

interface Subscriber {
  device: DeviceRecord
  push: DevicePush
}

export const createDeliveries = ({ registry, thisPc, peers, vapid, report }: DeliveryDeps) => {
  const subscribers = () => registry.list().flatMap(device => (device.push?.pc === thisPc.id ? [{ device, push: device.push }] : []))

  const owners = () => new Set(registry.list().flatMap(({ push }) => (push ? [push.pc] : [])))

  const forget = async ({ device, push }: Subscriber) => {
    if (registry.get(device.id)?.push?.endpoint === push.endpoint) await registry.setPush(device.id, undefined)
  }

  const send = async (subscriber: Subscriber, notice: Notice) => {
    if ((await sendPush(vapid, subscriber.push, notice)) === 'gone') await forget(subscriber)
  }

  const deliver = async (notice: Notice) => {
    const sends = subscribers().map(subscriber =>
      send(subscriber, notice).catch(error => report(new Error(`Couldn't notify ${subscriber.device.name}: ${errorMessage(error)}`))),
    )
    await Promise.all(sends)
  }

  const handOff = (pc: string, notice: Notice) =>
    peers.call(pc, notifyDeliver, notice).catch(error => report(new Error(`Couldn't hand a notification to ${peers.get(pc)?.name ?? pc}: ${errorMessage(error)}`)))

  const fanOut = async (notice: Notice) => {
    await Promise.all([...owners()].map(pc => (pc === thisPc.id ? deliver(notice) : handOff(pc, notice))))
  }

  return { deliver, fanOut }
}
