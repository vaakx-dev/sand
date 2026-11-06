import { wireHello } from '@sand/devices-contract'
import { featureState, type FeatureState } from '@sand/features/contract'
import { pluginsApply, pluginsChange, pluginsLocal, pluginsSkip, pluginsState, type PluginSyncState } from '@sand/host-plugin-sync/contract'
import { owned } from '@sand/reactive'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { WireContext } from '../context'
import { wireState } from '../wire-state'

export const syncSource = (ctx: WireContext) => {
  const { value: state, busy, load, run } = wireState<PluginSyncState>(ctx)
  const features = sig<FeatureState | undefined>(undefined)
  ctx.watch(featureState, found => features.set(found))
  const shared = derive(() => features.get()?.on('pcs') === true)
  const loadState = () => {
    if (shared.get()) load(pluginsState, {})
  }

  const apply = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, pluginsApply, { peer, plugins })

  const skip = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, pluginsSkip, { peer, plugins })

  const setLocal = (plugin: string, local: boolean) => run(`local:${plugin}`, pluginsLocal, { plugin, local })

  ctx.on(wireHello, loadState)
  ctx.effect(() => ctx.wire.on(pluginsChange, next => state.set(next)))
  owned(ctx, () =>
    effect(() => {
      if (shared.get()) untrack(loadState)
    }),
  )

  return { state, shared, busy, apply, skip, setLocal }
}

export type SyncSource = ReturnType<typeof syncSource>
