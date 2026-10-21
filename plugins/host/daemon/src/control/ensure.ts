import type { DaemonLaunch } from '../contract'
import { running, waitForRuntime } from './info'
import { switchSafe } from './safe'
import { start } from './start'

export const ensureRunning = async (home: string, { safe = false }: { safe?: boolean } = {}): Promise<DaemonLaunch> => {
  const found = await running(home)
  const info = found ?? (await start(home, { safe }))
  if (found && safe) await switchSafe(found, true)
  await waitForRuntime(info, home)
  return { info, started: !found }
}
