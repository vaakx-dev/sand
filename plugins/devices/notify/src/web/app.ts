import type { AndroidApp, Wire } from '@sand/devices-contract'
import { notifyListen, notifyUnsubscribe } from '../contract'
import type { PushChannel } from './channel'

const allowed = (app: AndroidApp) =>
  new Promise<void>((resolve, reject) => {
    const stop = app.on(reply => {
      switch (reply.kind) {
        case 'notices-allowed':
          stop()
          return resolve()
        case 'notices-refused':
          stop()
          return reject(new Error(reply.reason))
      }
    })
    app.send({ kind: 'allow-notices' })
  })

export const appPush = (app: AndroidApp, wire: Wire): PushChannel => ({
  support: () => 'ready',
  blocked: () => false,
  async subscribe() {
    await allowed(app)
    const { token } = await wire.call(notifyListen, {})
    app.send({ kind: 'listen', token })
  },
  async unsubscribe() {
    app.send({ kind: 'unlisten' })
    await wire.call(notifyUnsubscribe, {})
  },
})
