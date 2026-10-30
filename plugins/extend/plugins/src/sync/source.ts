import { wireHello } from '@sand/devices-contract'
import { pluginsApply, pluginsChange, pluginsLocal, pluginsSkip, pluginsState, type PluginSyncState } from '@sand/host-plugin-sync/contract'
import type { WireContext } from '../context'
import { wireState } from '../wire-state'

export const syncSource = (ctx: WireContext) => {
  const { value: state, busy, load, run } = wireState<PluginSyncState>(ctx)
  const loadState = () => load(pluginsState, {})

  const apply = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, pluginsApply, { peer, plugins })

  const skip = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, pluginsSkip, { peer, plugins })

  const setLocal = (plugin: string, local: boolean) => run(`local:${plugin}`, pluginsLocal, { plugin, local })

  ctx.on(wireHello, loadState)
  ctx.effect(() => ctx.wire.on(pluginsChange, next => state.set(next)))
  if (ctx.wire.ready()) loadState()

  return { state, busy, apply, skip, setLocal }
}

export type SyncSource = ReturnType<typeof syncSource>
