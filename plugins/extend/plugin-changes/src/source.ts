import type { PluginSyncState } from '@sand/host-plugin-sync/contract'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

export const pluginSource = (ctx: Context<'wire'>) => {
  const state = sig<PluginSyncState | undefined>(undefined)
  const busy = sig<string | undefined>(undefined)

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const load = () => {
    ctx.wire.call<PluginSyncState>({ type: 'plugins.state' }).then(
      next => state.set(next),
      () => state.set(undefined),
    )
  }

  const run = async (key: string, call: () => Promise<PluginSyncState>) => {
    busy.set(key)
    try {
      state.set(await call())
    } catch (error) {
      fail(error)
    } finally {
      busy.set(undefined)
    }
  }

  const apply = (peer: string, plugins: string[]) =>
    run(`${peer}:${plugins.join(',')}`, () => ctx.wire.call<PluginSyncState>({ type: 'plugins.apply', peer, plugins }))

  const skip = (peer: string, plugins: string[]) =>
    run(`${peer}:${plugins.join(',')}`, () => ctx.wire.call<PluginSyncState>({ type: 'plugins.skip', peer, plugins }))

  const setLocal = (plugin: string, local: boolean) =>
    run(`local:${plugin}`, () => ctx.wire.call<PluginSyncState>({ type: 'plugins.local', plugin, local }))

  ctx.on('wire.hello', load)
  ctx.on('wire.event', event => {
    if (event.name === 'plugins.change') state.set(event.args[0])
  })
  if (ctx.wire.hello()) load()

  return { state, busy, apply, skip, setLocal }
}

export type PluginSource = ReturnType<typeof pluginSource>
