import type { PluginOffer, PluginSyncState, PluginTree } from '../contract'

const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export const syncView = (
  mine: Record<string, PluginTree>,
  local: Set<string>,
  offers: PluginOffer[],
): PluginSyncState => ({
  plugins: Object.keys(mine)
    .sort(order)
    .map(name => ({ name, files: Object.keys(mine[name]?.files ?? {}).length, local: local.has(name) })),
  offers: [...offers].sort((a, b) => order(a.peerName, b.peerName) || order(a.plugin, b.plugin)),
})
