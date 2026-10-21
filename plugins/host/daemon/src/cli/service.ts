import type { ServerInfo } from '@sand/host-gateway/contract'
import type { Daemon } from '../contract'
import { ask } from '../control/ask'
import { ensureRunning } from '../control/ensure'
import { requireRunning, running } from '../control/info'
import { start } from '../control/start'
import { stop } from '../control/stop'

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
    async request(request, input, { to, timeout } = {}) {
      return ask(to ?? (await require()), request, input, timeout)
    },
  }
}
