import { compare } from '@sand/util'
import type { PluginOffer, PluginSyncState, PluginTree } from '../contract'

export const syncView = (
  mine: Record<string, PluginTree>,
  local: Set<string>,
  offers: PluginOffer[],
): PluginSyncState => ({
  plugins: Object.keys(mine)
    .sort(compare)
    .map(name => ({ name, files: Object.keys(mine[name]?.files ?? {}).length, local: local.has(name) })),
  offers: [...offers].sort((a, b) => compare(a.peerName, b.peerName) || compare(a.plugin, b.plugin)),
})
