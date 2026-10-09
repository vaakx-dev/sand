import type { PluginLibrary } from '@sand/protocol'
import { errorMessage, sig } from '@sand/dom'
import type { Context } from 'drydock'

type Action = 'plugins.customise' | 'plugins.keep' | 'plugins.restore'

export const librarySource = (ctx: Context<'wire'>) => {
  const library = sig<PluginLibrary | undefined>(undefined)
  const busy = sig<string | undefined>(undefined)

  const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })

  const load = () => {
    ctx.wire.call<PluginLibrary>({ type: 'plugins.library' }).then(next => library.set(next), fail)
  }

  const run = async (type: Action, plugin: string) => {
    busy.set(plugin)
    try {
      library.set(await ctx.wire.call<PluginLibrary>({ type, plugin }))
      return true
    } catch (error) {
      fail(error)
      return false
    } finally {
      busy.set(undefined)
    }
  }

  const customise = async (plugin: string) => {
    if (await run('plugins.customise', plugin))
      ctx.notify?.push(`${plugin} is now your copy in ~/.sand/plugins/${plugin}. Run /reload to use it.`)
  }

  const restore = async (plugin: string) => {
    if (await run('plugins.restore', plugin)) ctx.notify?.push(`Removed your copy of ${plugin}. Run /reload to use the built-in.`)
  }

  const keep = (plugin: string) => void run('plugins.keep', plugin)

  ctx.on('wire.hello', load)
  ctx.on('wire.event', event => {
    if (event.name === 'plugins.library') library.set(event.args[0])
    if (event.name === 'plugins.change') load()
  })
  if (ctx.wire.hello()) load()

  return { library, busy, customise, restore, keep, fail }
}

export type LibrarySource = ReturnType<typeof librarySource>
