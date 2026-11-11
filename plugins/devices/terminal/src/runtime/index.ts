import { pageLeft, type Server, server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { serveTerminals } from './requests'
import { system } from './system'
import { createTerminals } from './terminals'

export default definePlugin({
  name: 'devices-terminal',
  description: "Runs shells in a thread's folder for the terminal drawer, streams their output to the pages that show them and ends them when sand stops",
  apply(ctx) {
    let live: Server | undefined
    const terminals = createTerminals(
      system,
      {
        tell: (caller, event, payload) => live?.tell(caller, event, payload),
        broadcast: (event, payload) => live?.broadcast(event, payload),
      },
      (run, ms) => void setTimeout(run, ms).unref(),
    )
    ctx.effect(() => terminals.closeAll)
    ctx.on(pageLeft, caller => terminals.left(caller))
    ctx.watch(server, found => {
      if (!found) return
      live = found
      return joinDisposers(serveTerminals(found, terminals), () => {
        live = undefined
      })
    })
  },
})
