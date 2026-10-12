import { accessOf, callerOf, runtimeEnv } from '@sand/kit/host'
import type { HostMessage, Runtime, RuntimeMessage } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { createActivity } from './activity'
import { createDrain } from './drain'
import { createFailures } from './failures'
import { guardCrashes } from './guard'
import { createOwnership } from './ownership'

const id = process.env[runtimeEnv.id]
const secret = process.env[runtimeEnv.secret]
delete process.env[runtimeEnv.secret]

export const runtimeLink = definePlugin({
  name: 'runtime-link',
  inject: ['cli'],
  apply(ctx) {
    if (!id || !secret || !process.send) return

    guardCrashes(ctx)
    const send = (message: RuntimeMessage) => void process.send?.(message)
    const failures = createFailures(ctx)
    let ready = false
    let listened = false

    ctx.effect(() => {
      const timer = setTimeout(async () => {
        await ctx.settled()
        if (listened) return
        failures.stop()
        send({ type: 'failed', failed: failures.list() })
      })
      return () => clearTimeout(timer)
    })

    const activity = createActivity(ctx, current => {
      if (ready) send({ type: 'activity', activity: current })
      drain.check()
    })
    const drain = createDrain(ctx, { idle: activity.idle, pending: activity.pending, send })

    const ownership = createOwnership(ctx)

    const onHostMessage = (message: HostMessage) => {
      if (message.type === 'promote') ownership.promote(message.held)
      if (message.type === 'drain') {
        ownership.drain()
        drain.start()
      }
      if (message.type === 'release') ownership.release(message.sessions)
    }
    const onDisconnect = () => ctx.cli.exit(0)

    ctx.effect(() => {
      process.on('message', onHostMessage)
      process.on('disconnect', onDisconnect)
      return () => {
        process.off('message', onHostMessage)
        process.off('disconnect', onDisconnect)
      }
    })

    const runtime: Runtime = {
      id,
      access: request => accessOf(new URL(request.url), secret),
      caller: request => callerOf(new URL(request.url), secret),
      listening: url => {
        listened = true
        setTimeout(async () => {
          await ctx.settled()
          ready = true
          failures.stop()
          send({ type: 'ready', url, failed: failures.list() })
          activity.flush()
        })
      },
      swap: () => send({ type: 'swap' }),
      owns: ownership.owns,
    }
    ctx.provide('runtime', runtime)
  },
})
