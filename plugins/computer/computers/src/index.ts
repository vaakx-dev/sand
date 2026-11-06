import { server as serverService } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { computers, computersChange, computersChangeWire, computersControl, computersList } from './contract'
import { createRegistry } from './registry'

export default definePlugin({
  name: 'computers',
  description: 'The registry of computers the agent can see and use, and who controls each one: the agent or the user',
  apply(ctx) {
    const registry = createRegistry(() => ctx.emit(computersChange))
    ctx.provide(computers, registry)
    ctx.watch(serverService, server =>
      server
        ? joinDisposers(
            server.handle(computersList, () => registry.list()),
            server.handle(computersControl, ({ id, control }) => {
              registry.control(id, control)
              return registry.list()
            }),
            ctx.on(computersChange, () => server.broadcast(computersChangeWire, registry.list())),
          )
        : undefined,
    )
  },
})
