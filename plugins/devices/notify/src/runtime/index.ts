import { hostChannel } from '@sand/host-runtimes/contract'
import { turnEnd } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { type Notify, notify, notifySend } from '../contract'
import { turnMoment } from './turns'

export default definePlugin({
  name: 'devices-notify',
  description: "Hands this runtime's moments, such as a finished turn or a failed one, to the host to notify your devices",
  inject: { hostChannel },
  apply(ctx) {
    const service: Notify = { send: moment => ctx.hostChannel.call(notifySend, moment) }

    ctx.on(turnEnd, (session, result) => {
      const moment = turnMoment(session, result)
      if (moment) service.send(moment).catch(error => ctx.report(error))
    })
    ctx.provide(notify, service)
  },
})
