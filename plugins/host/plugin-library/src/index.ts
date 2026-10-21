import { hostApp, hostOptions } from '@sand/host-daemon/contract'
import { hostBuild } from '@sand/host-dist/contract'
import { hub } from '@sand/host-hub/contract'
import { hostVersions } from '@sand/host-plugin-versions/contract'
import { debouncedWatch } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { libraryActions } from './actions'
import { pluginsCustomise, pluginsKeep, pluginsLibrary, pluginsLibraryEvent, pluginsRestore, type PluginEntry } from './contract'
import { keptStore } from './store'
import { versioned } from './versioned'
import { type LibraryPaths, pluginsRoot, readLibrary } from './view'

const settle = 1000

export default definePlugin({
  name: 'host-plugin-library',
  description: 'Lists built-in and user plugins, and lets a user copy of a built-in replace it',
  inject: { hostOptions, hostApp, hostBuild, hub },
  async apply(ctx) {
    const { home } = ctx.hostOptions
    await mkdir(pluginsRoot(home), { recursive: true })
    const paths = (): LibraryPaths => ({ home, appRoot: ctx.hostApp.root() })
    const kept = await keptStore(home)
    const report = (error: unknown) => ctx.report(error)
    const actions = libraryActions({ paths, kept, build: () => ctx.hostBuild.info(), report })

    const library = () => readLibrary(paths(), kept)
    const after = async (run: () => Promise<void>): Promise<PluginEntry[]> => {
      await run()
      const next = await library()
      ctx.hub.broadcast(pluginsLibraryEvent, next)
      return next
    }

    const tracked = versioned(() => ctx.get(hostVersions), report)
    const customise = (name: string) => tracked('customise', name, () => actions.customise(name))
    const restore = (name: string) => tracked('restore', name, () => actions.restore(name))
    ctx.effect(() => ctx.hub.handle(pluginsLibrary, () => library()))
    ctx.effect(() => ctx.hub.handle(pluginsCustomise, ({ plugin }) => after(customise(plugin))))
    ctx.effect(() => ctx.hub.handle(pluginsKeep, ({ plugin }) => after(() => actions.keep(plugin))))
    ctx.effect(() => ctx.hub.handle(pluginsRestore, ({ plugin }) => after(restore(plugin))))
    ctx.effect(() => debouncedWatch(pluginsRoot(home), { recursive: false }, () => void actions.relink(), settle))
    void actions.relink()
  },
})
