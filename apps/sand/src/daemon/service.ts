import type { Daemon, DaemonRequestOptions, ServerInfo, WireRequest } from '@sand/protocol'
import { ask } from './ask'
import { ensureRunning } from './ensure'
import { requireRunning, running } from './info'
import { start } from './start'
import { stop } from './stop'

export const daemonService = (home: string): Daemon => {
  let known: ServerInfo | undefined
  const remember = (info: ServerInfo) => (known = info)
  const require = async (hint?: string) => known ?? remember(await requireRunning(home, hint))

  return {
    info: () => running(home),
    require,
    async ensure(options) {
      const launch = await ensureRunning(home, options)
      remember(launch.info)
      return launch
    },
    start: async () => remember(await start(home)),
    async stop() {
      known = undefined
      await stop(home)
    },
    async request<T>(request: WireRequest, { to, timeout }: DaemonRequestOptions = {}) {
      return ask<T>(to ?? (await require()), request, timeout)
    },
  }
}
