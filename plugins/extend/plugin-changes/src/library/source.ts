import type { PluginLibrary } from '@sand/host-plugin-library/contract'
import type { Context } from 'drydock'
import { whenShown } from '../shown'
import { wireState } from '../wire-state'

export const librarySource = (ctx: Context<'wire'>) => {
  const { value: library, busy, fail, load, run } = wireState<PluginLibrary>(ctx)

  const customise = async (plugin: string) => {
    if (await run(plugin, { type: 'plugins.customise', plugin }))
      ctx.notify?.push(`${plugin} is now your copy in ~/.sand/plugins/${plugin}. Run /reload to use it.`)
  }

  const restore = async (plugin: string) => {
    if (await run(plugin, { type: 'plugins.restore', plugin })) ctx.notify?.push(`Removed your copy of ${plugin}. Run /reload to use the built-in.`)
  }

  const keep = (plugin: string) => void run(plugin, { type: 'plugins.keep', plugin })

  const refresh = whenShown(ctx, () => load({ type: 'plugins.library' }))
  ctx.on('wire.event', event => {
    if (event.name === 'plugins.library') library.set(event.args[0])
    if (event.name === 'plugins.change') refresh()
  })

  return { library, busy, customise, restore, keep, fail }
}

export type LibrarySource = ReturnType<typeof librarySource>
