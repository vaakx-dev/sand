import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { pluginsApply, pluginsExchange, pluginsFiles, pluginsLocal, pluginsSkip, pluginsState } from './contract'
import type { PluginSync } from './types'

export const pluginRequests = (hub: Hub, sync: PluginSync): (() => Dispose)[] => [
  () => hub.handle(pluginsState, () => sync.state()),
  () => hub.handle(pluginsApply, ({ peer, plugins }) => sync.apply(peer, plugins)),
  () => hub.handle(pluginsSkip, ({ peer, plugins }) => sync.skip(peer, plugins)),
  () => hub.handle(pluginsLocal, ({ plugin, local }) => sync.setLocal(plugin, local)),
  () => hub.handle(pluginsExchange, ({ manifest }, caller) => sync.exchange(manifest, caller.device)),
  () => hub.handle(pluginsFiles, ({ plugin }) => sync.files(plugin)),
]
