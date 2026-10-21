import {
  type PluginEntry,
  pluginsCustomise,
  pluginsKeep,
  pluginsLibrary,
  pluginsLibraryEvent,
  pluginsRestore,
} from '@sand/host-plugin-library/contract'
import { pluginsChange } from '@sand/host-plugin-sync/contract'
import type { WireContext } from '../context'
import { whenShown } from '../shown'
import { wireState } from '../wire-state'

export const librarySource = (ctx: WireContext) => {
  const { value: plugins, busy, load, run } = wireState<PluginEntry[]>(ctx)

  const customise = (plugin: string) => run(plugin, pluginsCustomise, { plugin })

  const restore = (plugin: string) => run(plugin, pluginsRestore, { plugin })

  const keep = (plugin: string) => void run(plugin, pluginsKeep, { plugin })

  const refresh = whenShown(ctx, () => load(pluginsLibrary, {}))
  ctx.effect(() => ctx.wire.on(pluginsLibraryEvent, next => plugins.set(next)))
  ctx.effect(() => ctx.wire.on(pluginsChange, refresh))

  return { plugins, busy, customise, restore, keep }
}

export type LibrarySource = ReturnType<typeof librarySource>
