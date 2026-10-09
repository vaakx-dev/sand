import type { Hub, PluginLibrary } from '@sand/protocol'
import { debouncedWatch } from '@sand/host'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { libraryActions } from './actions'
import { keptStore } from './store'
import { type LibraryPaths, pluginsRoot, readLibrary } from './view'

const settle = 1000

const pluginName = (value: unknown): string => {
  if (typeof value !== 'string' || !value) throw new Error('plugin must be a plugin folder name')
  return value
}

export const pluginLibraryPlugin = definePlugin({
  name: 'plugin-library',
  description: 'Lists built-in and user plugins, and lets a user copy of a built-in replace it',
  inject: ['hostOptions', 'hostApp', 'hostBuild', 'hub'],
  async apply(ctx) {
    const { home } = ctx.hostOptions
    await mkdir(pluginsRoot(home), { recursive: true })
    const paths = (): LibraryPaths => ({ home, appRoot: ctx.hostApp.root() })
    const kept = await keptStore(home)
    const actions = libraryActions({ paths, kept, build: () => ctx.hostBuild.info() })
    const hub: Hub = ctx.hub

    const library = () => readLibrary(paths(), kept)
    const after = async (run: () => Promise<void>): Promise<PluginLibrary> => {
      await run()
      const next = await library()
      hub.broadcast({ name: 'plugins.library', args: [next] })
      return next
    }

    ctx.effect(() => hub.handle('plugins.library', () => library()))
    ctx.effect(() => hub.handle('plugins.customise', ({ plugin }) => after(() => actions.customise(pluginName(plugin)))))
    ctx.effect(() => hub.handle('plugins.keep', ({ plugin }) => after(() => actions.keep(pluginName(plugin)))))
    ctx.effect(() => hub.handle('plugins.restore', ({ plugin }) => after(() => actions.restore(pluginName(plugin)))))
    ctx.effect(() => debouncedWatch(pluginsRoot(home), { recursive: false }, () => void actions.relink(), settle))
    void actions.relink()
  },
})
