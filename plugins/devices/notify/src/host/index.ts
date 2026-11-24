import { type DeviceRecord, peers as peersService, registry as registryService, thisPc as thisPcService } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub as hubService } from '@sand/host-hub/contract'
import { uuid } from '@sand/util'
import { hashSecret, randomSecret } from '@sand/util/fs'
import { bearerToken, textReply } from '@sand/util/host'
import { definePlugin } from 'drydock'
import {
  helloMomentsOff,
  helloPushKey,
  inboxPath,
  type Moment,
  moments,
  type Notice,
  notify,
  notifyDeliver,
  notifyListen,
  notifyMoment,
  notifyMomentsOff,
  notifyNotice,
  notifySend,
  notifySubscribe,
  notifyUnsubscribe,
} from '../contract'
import { createDeliveries } from './deliveries'
import { Inbox } from './inbox'
import { loadMoments } from './moments'
import { loadVapid } from './vapid'

const bodyOf = ({ kind, text }: Moment) => (text ? `${moments[kind].label}: ${text}` : moments[kind].label)

const unknownApp = () => textReply('this app is not listening for notifications; turn them on in Settings › Notifications', 401, { 'www-authenticate': 'Bearer' })

export default definePlugin({
  name: 'devices-notify',
  description:
    "Shows each moment the user wants on this PC's pages and sends it to every device that turned notifications on, through the PC that owns its subscription: by Web Push to browsers, and to the Android app over its own connection, held until the app picks it up",
  inject: { hostOptions, hostHttp, hub: hubService, registry: registryService, thisPc: thisPcService },
  async apply(ctx) {
    const { hostHttp, hub, registry, thisPc } = ctx
    const vapid = await loadVapid(ctx.hostOptions.home)
    const chosen = await loadMoments(ctx.hostOptions.home)
    const inbox = await Inbox.load(ctx.hostOptions.home)
    const deliveries = createDeliveries({ registry, thisPc, peers: () => ctx.get(peersService), vapid, inbox, report: error => ctx.report(error) })

    const noticeOf = (moment: Moment): Notice => ({
      title: moment.title,
      body: bodyOf(moment),
      tag: uuid(),
      pc: thisPc.id,
      ...(moment.thread && { thread: moment.thread }),
      ...(moment.bot && { bot: moment.bot }),
    })

    const send = async (moment: Moment) => {
      if (!chosen.wanted(moment.kind)) return
      const notice = noticeOf(moment)
      hub.broadcast(notifyNotice, notice, 'user')
      await deliveries.fanOut(notice)
    }

    const appToken = (record: DeviceRecord | undefined) => (record?.push?.kind === 'app' && record.push.pc === thisPc.id && !record.removed ? record.push.token : undefined)

    const opening = (request: Request) => {
      const token = bearerToken(request)
      if (!token) return undefined
      const hash = hashSecret(token)
      const device = registry.list().find(record => appToken(record) === hash)
      return device && { device: device.id, token: hash, seen: request.headers.get('last-event-id') ?? undefined }
    }

    ctx.effect(() => hub.greet(helloPushKey, () => vapid.publicKey))
    ctx.effect(() => hub.greet(helloMomentsOff, chosen.off))
    ctx.effect(() => hub.handle(notifySend, send))
    ctx.effect(() => hub.handle(notifyDeliver, deliveries.deliver))
    ctx.effect(() =>
      hub.handle(notifySubscribe, async (target, caller) => {
        await registry.setPush(caller.device, { kind: 'web', pc: thisPc.id, ...target })
      }),
    )
    ctx.effect(() =>
      hub.handle(notifyListen, async (_, caller) => {
        const token = randomSecret()
        await registry.setPush(caller.device, { kind: 'app', pc: thisPc.id, token: hashSecret(token) })
        return { token }
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
    ctx.effect(() =>
      hostHttp.route(inboxPath, {
        method: 'GET',
        handle: async ({ request }) => {
          const found = opening(request)
          return found ? inbox.open(found) : unknownApp()
        },
      }),
    )
    ctx.effect(() => registry.onChange(() => void inbox.keep(device => appToken(registry.get(device))).catch(error => ctx.report(error))))
    ctx.effect(() => () => inbox.close())
    ctx.provide(notify, { send })
  },
})
