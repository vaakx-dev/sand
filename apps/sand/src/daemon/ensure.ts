import type { DaemonLaunch } from '@sand/protocol'
import { isAlive, readInfo, running, waitForRuntime } from './info'
import { switchSafe } from './safe'
import { start } from './start'

const refuseOlder = async (home: string) => {
  const info = await readInfo(home)
  if (info && !info.key && isAlive(info.pid)) throw new Error('an older sand is running; run `sand stop` first')
}

export const ensureRunning = async (home: string, { safe = false }: { safe?: boolean } = {}): Promise<DaemonLaunch> => {
  const found = await running(home)
  if (!found) await refuseOlder(home)
  const info = found ?? (await start(home, { safe }))
  if (found && safe) await switchSafe(found, true)
  await waitForRuntime(info, home)
  return { info, started: !found }
}
