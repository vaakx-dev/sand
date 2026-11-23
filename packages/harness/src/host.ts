import { inSandbox } from '@sand/boot'
import { cli } from '@sand/config/contract'
import { createHandlers, hub, type Hub, type WireEvent } from '@sand/host-hub/contract'
import { createHostChannel, type HostChannel, type HostMessage, type RuntimeMessage, runtimes, type Runtimes } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'
import { type Context, createApp, type Dispose } from 'drydock'
import { resolve } from 'node:path'
import { Plugins } from './plugins'

export interface HostLink {
  channel: HostChannel
  close: Dispose
}

type Handlers = ReturnType<typeof createHandlers>

const builtins = resolve(import.meta.dir, '..', '..', '..', 'plugins')

const unsubscribed = () => () => {}

const hubOf = (handlers: Handlers): Hub => ({
  open() {},
  message() {},
  close() {},
  disconnect() {},
  devices: () => [],
  broadcast() {},
  answer: handlers.answer,
  tell() {},
  onLeave: unsubscribed,
  greet: unsubscribed,
  handle: handlers.handle,
})

const runtimesOf = (tell: Runtimes['tell']): Runtimes => ({
  current: () => undefined,
  live: () => [],
  wait: async () => undefined,
  swap: async () => false,
  retire: async () => {},
  swapped: () => undefined,
  status: () => ({ pid: process.pid, runtime: 'ready', draining: 0 }),
  tell,
})

const answerOf = async (handlers: Handlers, runtime: string, message: RuntimeMessage): Promise<HostMessage | undefined> => {
  if (message.type !== 'call') return undefined
  try {
    return { type: 'answer', id: message.id, result: await handlers.answer(message.request, message.input, message.caller ?? { device: runtime, kind: 'runtime' }) }
  } catch (error) {
    return { type: 'answer', id: message.id, error: errorMessage(error) }
  }
}

export const startHost = async (home: string, plugins: string[] = [], prepare: (app: Context) => void = () => {}) => {
  const app = createApp()
  const handlers = createHandlers()
  const linked = new Map<string, (message: HostMessage) => void>()

  const tell: Runtimes['tell'] = <P>(runtime: string, event: WireEvent<P>, payload: P) => {
    const receive = linked.get(runtime)
    receive?.({ type: 'event', name: event.id, payload })
    return receive !== undefined
  }

  app.provide(cli, { place: 'host', home, cwd: home, builtins, safe: false, sandbox: inSandbox(home), args: [], exit() {} })
  app.provide(hub, hubOf(handlers))
  app.provide(runtimes, runtimesOf(tell))
  prepare(app)
  const own = new Plugins({ app, builtins, place: 'host' })
  await own.load(plugins)
  await own.start()

  return {
    app,
    link(): HostLink {
      const runtime = Bun.randomUUIDv7()
      const host = createHostChannel(message => void answerOf(handlers, runtime, message).then(answer => answer && host.receive(answer)))
      linked.set(runtime, host.receive)
      return {
        channel: host.channel,
        close() {
          linked.delete(runtime)
          host.close()
        },
      }
    },
    stop: () => app.dispose(),
  }
}

export type TestHost = Awaited<ReturnType<typeof startHost>>
