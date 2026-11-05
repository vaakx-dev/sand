import { peers as peersService, registry as registryService, thisPc as thisPcService } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub as hubService } from '@sand/host-hub/contract'
import { uuid } from '@sand/util'
import { definePlugin } from 'drydock'
import {
  helloPushKey,
  type Moment,
  momentLabels,
  type Notice,
  notify,
  notifyDeliver,
  notifyNotice,
  notifySend,
  notifySubscribe,
  notifyUnsubscribe,
} from '../contract'
import { createDeliveries } from './deliveries'
import { loadVapid } from './vapid'

const bodyOf = ({ kind, text }: Moment) => (text ? `${momentLabels[kind]}: ${text}` : momentLabels[kind])

export default definePlugin({
  name: 'devices-notify',
  description: "Shows each moment on this PC's pages and sends it by Web Push to every device that turned notifications on, through the PC that owns its subscription",
  inject: { hostOptions, hub: hubService, registry: registryService, thisPc: thisPcService, peers: peersService },
  async apply(ctx) {
    const { hub, registry, thisPc, peers } = ctx
    const vapid = await loadVapid(ctx.hostOptions.home)
    const deliveries = createDeliveries({ registry, thisPc, peers, vapid, report: error => ctx.report(error) })

    const noticeOf = (moment: Moment): Notice => ({ title: moment.title, body: bodyOf(moment), tag: uuid(), pc: thisPc.id, thread: moment.thread })

    const send = async (moment: Moment) => {
      const notice = noticeOf(moment)
      hub.broadcast(notifyNotice, notice, 'user')
      await deliveries.fanOut(notice)
    }

    ctx.effect(() => hub.greet(helloPushKey, () => vapid.publicKey))
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
    ctx.provide(notify, { send })
  },
})
