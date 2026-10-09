import type { RemoteRecord } from '@sand/protocol'
import { jsonListStore } from '@sand/host'
import { join } from 'node:path'

export const readRemotes = async (home: string) => {
  const store = await jsonListStore<RemoteRecord>(join(home, 'remotes.json'))
  return store.list().filter(remote => typeof remote?.key === 'string' && remote.key && typeof remote.url === 'string')
}
