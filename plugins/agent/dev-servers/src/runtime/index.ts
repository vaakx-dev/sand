import type { Caller } from '@sand/host-hub/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { processes } from '@sand/processes/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin, event } from 'drydock'
import { z } from 'zod'
import { devServerList, devServersChange, devServerStop, type DevServer, helloDevServers } from '../contract'
import { offerDevServerTools } from '../tools'
import { createScanner } from './scan'
import { stopServer } from './stop'

const found = event<(servers: DevServer[]) => void>('devServers.found')

const threadOf = (caller: Caller) => (caller.actor?.owner === 'thread' ? caller.actor.id : undefined)

const sameServers = (first: DevServer[], second: DevServer[]) => JSON.stringify(first) === JSON.stringify(second)

export default definePlugin({
  name: 'dev-servers',
  description: "Finds the web servers each thread's commands started on this PC, even ones left running in the background, and lists and stops them",
  config: z.object({ every_ms: z.number().int().positive().default(3_000) }),
  apply(ctx, config) {
    const scanner = createScanner(() => ctx.get(processes))
    let current: DevServer[] = []
    let scanning = Promise.resolve()

    const refresh = async () => {
      const next = await scanner.scan()
      if (sameServers(current, next)) return
      current = next
      ctx.emit(found, next)
    }

    const rescan = () => (scanning = scanning.then(refresh).catch(error => ctx.report(error)))

    const stop = async (port: number) => {
      const shown = current.find(entry => entry.port === port)
      const tree = shown && (await ctx.get(processes)?.trees())?.find(owned => owned.processes.some(entry => entry.pid === shown.pid))
      if (!shown || !tree) return false
      await stopServer(tree, shown.pid)
      await rescan()
      return true
    }

    ctx.effect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined
      let stopped = false
      const tick = () =>
        rescan().finally(() => {
          if (!stopped) timer = setTimeout(tick, config.every_ms)
        })
      void tick()
      return () => {
        stopped = true
        clearTimeout(timer)
      }
    })

    ctx.watch(
      server,
      host =>
        host &&
        joinDisposers(
          host.hello(helloDevServers, () => current),
          host.handle(devServerList, ({ session }, caller) => {
            const owner = session ?? threadOf(caller)
            return owner ? current.filter(entry => entry.session === owner) : current
          }),
          host.handle(devServerStop, ({ port }) => stop(port)),
          ctx.on(found, servers => host.broadcast(devServersChange, servers)),
        ),
    )
    ctx.watch(mcpTools, tools => tools && offerDevServerTools(tools))
  },
})
