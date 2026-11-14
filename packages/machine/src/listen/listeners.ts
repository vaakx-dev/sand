import type { Listener } from './host'
import { linuxListeners } from './linux'
import { macListeners } from './mac'
import { windowsListeners } from './windows'

const listeners = async (pids: Iterable<number>): Promise<Listener[]> => {
  const owners = new Set(pids)
  if (!owners.size) return []
  if (process.platform === 'win32') return windowsListeners(owners)
  if (process.platform === 'linux') return linuxListeners(owners)
  return macListeners(owners)
}

export { listeners }
