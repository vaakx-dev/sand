import { type Caller, hub, type WireEvent } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { commandExit, commandOutput, commandsKept, commandStart, commandStarted, commandStop } from '../contract'
import { Keeper } from '../keeper'

export default definePlugin({
  name: 'shell-host',
  description: "Keeps background commands in sand's host, so they outlive the runtime that started them when plugins reload, and stops them when sand stops",
  inject: { hub, runtimes },
  apply(ctx) {
    const followers = new Set<string>()

    const tell = <P>(event: WireEvent<P>, payload: P) => {
      for (const runtime of [...followers]) if (!ctx.runtimes.tell(runtime, event, payload)) followers.delete(runtime)
    }

    const keeper = new Keeper({
      started: command => tell(commandStarted, command),
      output: (id, text) => tell(commandOutput, { id, text }),
      exit: (id, code) => tell(commandExit, { id, code }),
    })

    const follow = ({ device }: Caller) => followers.add(device)

    ctx.effect(() =>
      joinDisposers(
        ctx.hub.handle(commandStart, (launch, caller) => {
          follow(caller)
          return keeper.start(launch)
        }),
        ctx.hub.handle(commandsKept, (_, caller) => {
          follow(caller)
          return keeper.kept()
        }),
        ctx.hub.handle(commandStop, ({ id }) => keeper.stop(id)),
      ),
    )
    ctx.effect(() => () => {
      followers.clear()
      keeper.close()
    })
  },
})
