import type { PluginSyncState } from '@sand/host-plugin-sync/contract'
import type { Context } from 'drydock'
import { wireState } from './wire-state'

export const pluginSource = (ctx: Context<'wire'>) => {
  const { value: state, busy, load, run } = wireState<PluginSyncState>(ctx)
  const loadState = () => load({ type: 'plugins.state' })

  const apply = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, { type: 'plugins.apply', peer, plugins })

  const skip = (peer: string, plugins: string[]) => run(`${peer}:${plugins.join(',')}`, { type: 'plugins.skip', peer, plugins })

  const setLocal = (plugin: string, local: boolean) => run(`local:${plugin}`, { type: 'plugins.local', plugin, local })

  ctx.on('wire.hello', loadState)
  ctx.on('wire.event', event => {
    if (event.name === 'plugins.change') state.set(event.args[0])
  })
  if (ctx.wire.hello()) loadState()

  return { state, busy, apply, skip, setLocal }
}

export type PluginSource = ReturnType<typeof pluginSource>
