import { debouncedWatch } from '@sand/kit/fs'
import { validPluginName } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { libraryActions } from './actions'
import type { PluginLibrary } from './contract'
import { keptStore } from './store'
import { versioned } from './versioned'
import { type LibraryPaths, pluginsRoot, readLibrary } from './view'

const settle = 1000

const pluginName = (value: unknown): string => {
  if (typeof value !== 'string' || !validPluginName(value)) throw new Error('plugin must be a plugin folder name')
  return value
}

export default definePlugin({
  name: 'host-plugin-library',
  description: 'Lists built-in and user plugins, and lets a user copy of a built-in replace it',
  inject: ['hostOptions', 'hostApp', 'hostBuild', 'hub'],
  uses: { hostVersions: 'customising or restoring a plugin keeps no past version' },
  async apply(ctx) {
    const { home } = ctx.hostOptions
    await mkdir(pluginsRoot(home), { recursive: true })
    const paths = (): LibraryPaths => ({ home, appRoot: ctx.hostApp.root() })
    const kept = await keptStore(home)
    const report = (error: unknown) => ctx.report(error)
    const actions = libraryActions({ paths, kept, build: () => ctx.hostBuild.info(), report })

    const library = () => readLibrary(paths(), kept)
    const after = async (run: () => Promise<void>): Promise<PluginLibrary> => {
      await run()
      const next = await library()
      ctx.hub.broadcast({ name: 'plugins.library', args: [next] })
      return next
    }

    const tracked = versioned(() => ctx.hostVersions, report)
    const customise = (name: string) => tracked('customise', name, () => actions.customise(name))
    const restore = (name: string) => tracked('restore', name, () => actions.restore(name))
    ctx.effect(() => ctx.hub.handle('plugins.library', () => library()))
    ctx.effect(() => ctx.hub.handle('plugins.customise', ({ plugin }) => after(customise(pluginName(plugin)))))
    ctx.effect(() => ctx.hub.handle('plugins.keep', ({ plugin }) => after(() => actions.keep(pluginName(plugin)))))
    ctx.effect(() => ctx.hub.handle('plugins.restore', ({ plugin }) => after(restore(pluginName(plugin)))))
    ctx.effect(() => debouncedWatch(pluginsRoot(home), { recursive: false }, () => void actions.relink(), settle))
    void actions.relink()
  },
})
