import { peers as peersService, registry as registryService, thisPc as thisPcService } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub as hubService } from '@sand/host-hub/contract'
import { uuid } from '@sand/util'
import { definePlugin } from 'drydock'
import {
  helloMomentsOff,
  helloPushKey,
  type Moment,
  moments,
  type Notice,
  notify,
  notifyDeliver,
  notifyMoment,
  notifyMomentsOff,
  notifyNotice,
  notifySend,
  notifySubscribe,
  notifyUnsubscribe,
} from '../contract'
import { createDeliveries } from './deliveries'
import { loadMoments } from './moments'
import { loadVapid } from './vapid'

const bodyOf = ({ kind, text }: Moment) => (text ? `${moments[kind].label}: ${text}` : moments[kind].label)

export default definePlugin({
  name: 'devices-notify',
  description:
    "Shows each moment the user wants on this PC's pages and sends it by Web Push to every device that turned notifications on, through the PC that owns its subscription",
  inject: { hostOptions, hub: hubService, registry: registryService, thisPc: thisPcService },
  async apply(ctx) {
    const { hub, registry, thisPc } = ctx
    const vapid = await loadVapid(ctx.hostOptions.home)
    const chosen = await loadMoments(ctx.hostOptions.home)
    const deliveries = createDeliveries({ registry, thisPc, peers: () => ctx.get(peersService), vapid, report: error => ctx.report(error) })

    const noticeOf = (moment: Moment): Notice => ({
      title: moment.title,
      body: bodyOf(moment),
      tag: uuid(),
      pc: thisPc.id,
      ...(moment.thread && { thread: moment.thread }),
    })

    const send = async (moment: Moment) => {
      if (!chosen.wanted(moment.kind)) return
      const notice = noticeOf(moment)
      hub.broadcast(notifyNotice, notice, 'user')
      await deliveries.fanOut(notice)
    }

    ctx.effect(() => hub.greet(helloPushKey, () => vapid.publicKey))
    ctx.effect(() => hub.greet(helloMomentsOff, chosen.off))
    ctx.effect(() => hub.handle(notifySend, send))
    ctx.effect(() => hub.handle(notifyDeliver, deliveries.deliver))
    ctx.effect(() =>
      hub.handle(notifySubscribe, async (target, caller) => {
        await registry.setPush(caller.device, { pc: thisPc.id, ...target })
      }),
    )
    ctx.effect(() =>
      hub.handle(notifyUnsubscribe, async (_, caller) => {
        await registry.setPush(caller.device, undefined)
      }),
    )
    ctx.effect(() =>
      hub.handle(notifyMoment, async ({ kind, on }) => {
        await chosen.set(kind, on)
        hub.broadcast(notifyMomentsOff, chosen.off(), 'user')
      }),
    )
    ctx.provide(notify, { send })
  },
})
