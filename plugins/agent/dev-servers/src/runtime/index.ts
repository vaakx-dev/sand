import { type Conversation, engine } from '@sand/engine/contract'
import type { Caller } from '@sand/host-hub/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { processes } from '@sand/processes/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin, event } from 'drydock'
import { basename, resolve } from 'node:path'
import { z } from 'zod'
import {
  devServerList,
  devServerOpen,
  devServerProxiesKeep,
  devServerProxy,
  devServerShare,
  devServersChange,
  devServerStop,
  type DevServer,
  helloDevServers,
  ONE_SITE,
  type Share,
  type SharedSite,
  sharedSiteEntry,
} from '../contract'
import { offerDevServerTools } from '../tools'
import { Folders } from './folder'
import { createScanner } from './scan'
import { stopServer } from './stop'

const found = event<(servers: DevServer[]) => void>('devServers.found')

const sameServers = (first: DevServer[], second: DevServer[]) => JSON.stringify(first) === JSON.stringify(second)

export default definePlugin({
  name: 'dev-servers',
  description: "Finds the web servers each thread's and bot's commands started on this PC, even ones left running in the background, and lists, opens and stops them",
  config: z.object({ every_ms: z.number().int().positive().default(3_000) }),
  apply(ctx, config) {
    const scanner = createScanner(() => ctx.get(processes))
    const folders = new Folders()
    let current: DevServer[] = []
    let scanning = Promise.resolve()

    const refresh = async () => {
      const next = [...(await scanner.scan()), ...folders.list()]
      if (sameServers(current, next)) return
      current = next
      ctx.emit(found, next)
      void ctx
        .get(hostChannel)
        ?.call(devServerProxiesKeep, { ports: next.map(entry => entry.port) })
        .catch(() => undefined)
    }

    const rescan = () => (scanning = scanning.then(refresh).catch(error => ctx.report(error)))

    const stop = async (port: number) => {
      if (folders.stop(port)) {
        await rescan()
        return true
      }
      const shown = current.find(entry => entry.port === port)
      const tree = shown && (await ctx.get(processes)?.trees())?.find(owned => owned.processes.some(entry => entry.pid === shown.pid))
      if (!shown || !tree) return false
      await stopServer(tree, shown.pid)
      await rescan()
      return true
    }

    const open = (port: number, device: string) => {
      const shown = current.find(entry => entry.port === port)
      if (!shown) throw new Error(`No server a thread or bot started listens on port ${port}`)
      const channel = ctx.get(hostChannel)
      if (!channel) throw new Error("Opening a dev server needs sand's host, which isn't running")
      return channel.call(devServerProxy, { port, address: shown.address, device })
    }

    const startedBy = async (port: number, session: string) => {
      await rescan()
      const shown = current.find(entry => entry.port === port && entry.session === session)
      if (!shown) throw new Error(`No web server this thread started listens on port ${port}`)
      return shown
    }

    const servedFolder = async (folder: string, session: string) => {
      const shown = await folders.serve(folder, session)
      await rescan()
      return shown
    }

    const sharedOf = ({ folder, port }: Share, { id, cwd }: Conversation) => {
      if (folder !== undefined) return servedFolder(resolve(cwd, folder), id)
      if (port !== undefined) return startedBy(port, id)
      throw new Error(ONE_SITE)
    }

    const titleOf = ({ folder, title }: Share, shown: DevServer) => title ?? (folder === undefined ? `localhost:${shown.port}` : basename(shown.command))

    const share = async (input: Share, { actor }: Caller) => {
      const conversation = actor && ctx.get(engine)?.open(actor)
      if (!conversation) throw new Error('Only a thread or bot can share a website, into its own chat')
      const shown = await sharedOf(input, conversation)
      conversation.append(sharedSiteEntry, { port: shown.port, title: titleOf(input, shown) } satisfies SharedSite)
      return shown
    }

    ctx.effect(() => () => folders.stopAll())

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
          host.handle(devServerList, ({ session }) => (session ? current.filter(entry => entry.session === session) : current)),
          host.handle(devServerStop, ({ port }) => stop(port)),
          host.handle(devServerOpen, ({ port }, caller) => open(port, caller.device)),
          host.handle(devServerShare, share),
          ctx.on(found, servers => host.broadcast(devServersChange, servers)),
        ),
    )
    ctx.watch(mcpTools, tools => tools && offerDevServerTools(tools))
  },
})
