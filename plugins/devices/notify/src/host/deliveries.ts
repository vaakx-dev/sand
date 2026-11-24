import type { DevicePush, DeviceRecord, Peers, Registry, ThisPc, WebPush } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { type Notice, notifyDeliver } from '../contract'
import type { Inbox } from './inbox'
import { sendPush } from './push'
import type { Vapid } from './vapid'

export interface DeliveryDeps {
  registry: Registry
  thisPc: ThisPc
  peers(): Peers | undefined
  vapid: Vapid
  inbox: Inbox
  report(error: unknown): void
}

interface Subscriber {
  device: DeviceRecord
  push: DevicePush
}

export const createDeliveries = ({ registry, thisPc, peers, vapid, inbox, report }: DeliveryDeps) => {
  const subscribers = () => registry.list().flatMap(device => (device.push?.pc === thisPc.id ? [{ device, push: device.push }] : []))

  const owners = () => new Set(registry.list().flatMap(({ push }) => (push ? [push.pc] : [])))

  const forget = async (device: DeviceRecord, push: WebPush) => {
    const current = registry.get(device.id)?.push
    if (current?.kind !== 'app' && current?.endpoint === push.endpoint) await registry.setPush(device.id, undefined)
  }

  const sendWeb = async (device: DeviceRecord, push: WebPush, notice: Notice) => {
    if ((await sendPush(vapid, push, notice)) === 'gone') await forget(device, push)
  }

  const send = ({ device, push }: Subscriber, notice: Notice) => (push.kind === 'app' ? inbox.post(device.id, notice) : sendWeb(device, push, notice))

  const deliver = async (notice: Notice) => {
    const sends = subscribers().map(subscriber =>
      send(subscriber, notice).catch(error => report(new Error(`Couldn't notify ${subscriber.device.name}: ${errorMessage(error)}`))),
    )
    await Promise.all(sends)
  }

  const handOff = async (pc: string, notice: Notice) => {
    const found = peers()
    if (!found) return
    await found.call(pc, notifyDeliver, notice).catch(error => report(new Error(`Couldn't hand a notification to ${found.get(pc)?.name ?? pc}: ${errorMessage(error)}`)))
  }

  const fanOut = async (notice: Notice) => {
    await Promise.all([...owners()].map(pc => (pc === thisPc.id ? deliver(notice) : handOff(pc, notice))))
  }

  return { deliver, fanOut }
}
