import { cli } from '@sand/config/contract'
import { hostRestart } from '@sand/host-daemon/contract'
import { type Caller, hub, type WireEvent } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { commandExit, commandOutput, commandsHeld, commandsKept, commandStart, commandStarted, commandStop } from '../contract'
import { Link } from './link'

export default definePlugin({
  name: 'command-keeper',
  description:
    "Holds background commands in a small keeper process that outlives sand's restarts and updates, so a fresh host and runtime take them over; they stop when sand really stops, and the keeper leaves once it holds nothing",
  inject: { hub, runtimes, cli },
  apply(ctx) {
    const followers = new Set<string>()

    const tell = <P>(event: WireEvent<P>, payload: P) => {
      for (const runtime of [...followers]) if (!ctx.runtimes.tell(runtime, event, payload)) followers.delete(runtime)
    }

    const link = new Link(ctx.cli.home, {
      started: command => tell(commandStarted, command),
      output: (id, text) => tell(commandOutput, { id, text }),
      exit: (id, code) => tell(commandExit, { id, code }),
    })

    const follow = ({ device }: Caller) => followers.add(device)

    ctx.effect(() =>
      joinDisposers(
        ctx.hub.handle(commandStart, (launch, caller) => {
          follow(caller)
          return link.start(launch)
        }),
        ctx.hub.handle(commandsKept, (_, caller) => {
          follow(caller)
          return link.kept()
        }),
        ctx.hub.handle(commandStop, ({ id }) => link.stop(id)),
      ),
    )
    ctx.on(hostRestart, () => {
      link.hold()
      tell(commandsHeld, undefined)
    })
    ctx.effect(() => () => {
      followers.clear()
      link.close()
    })
  },
})
