import type { AndroidApp, PushTarget } from '@sand/devices-contract'
import type { PushChannel } from './channel'

const answer = (app: AndroidApp) =>
  new Promise<PushTarget>((resolve, reject) => {
    const stop = app.on(reply => {
      switch (reply.kind) {
        case 'push':
          stop()
          return resolve(reply.target)
        case 'push-failed':
          stop()
          return reject(new Error(reply.reason))
      }
    })
  })

export const appPush = (app: AndroidApp): PushChannel => ({
  support: () => (app.push ? 'ready' : 'distributor'),
  blocked: () => false,
  subscribe(key) {
    const answered = answer(app)
    app.send({ kind: 'subscribe', key })
    return answered
  },
  async unsubscribe() {
    app.send({ kind: 'unsubscribe' })
  },
})
