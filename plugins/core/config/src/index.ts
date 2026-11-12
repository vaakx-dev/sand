import { definePlugin, evict, type Scope } from 'drydock'
import { join } from 'node:path'
import { cli, definitionsIn, featureOf, features, pluginSwitches, sandConfig } from './contract'
import { createCatalog } from './features/catalog'
import { writeFeatures } from './features/toml'
import { addonPlugins, builtinPlugins, entryIn, runsNowhere, sandOf, userPlugins } from './find'
import { serviceOwners } from './off/owners'
import { createSwitches } from './off/switches'
import { startOrder } from './order'
import { optionsOf } from './plugins'
import { configPath, readConfig } from './read'

export default definePlugin({
  name: 'config',
  description: 'Finds the plugins that run in this place and loads them with their sand.toml settings, leaving out the plugins of features that are turned off',
  inject: { cli },
  async apply(ctx) {
    const { home, safe, place, builtins } = ctx.cli
    const path = await configPath(home)
    const table = await readConfig(path)
    ctx.provide(sandConfig, { path, section: name => table[name] })

    const settings = safe ? undefined : table.plugins
    const userRoot = join(home, 'plugins')
    const ownFolders = async () => {
      if (safe) return []
      return place === 'host' ? addonPlugins(userRoot) : userPlugins(userRoot, settings)
    }
    const discover = async () => {
      const own = await ownFolders()
      const mine = new Set(own.map(([id]) => id))
      const found = new Map([...(await builtinPlugins(builtins)), ...own])
      return Promise.all(
        [...found].map(async ([id, dir]) => {
          const sand = await sandOf(dir)
          return { id, dir, sand, own: mine.has(id), options: optionsOf(settings, id), entry: entryIn(dir, sand, place), feature: featureOf(sand) }
        }),
      )
    }
    const chosenFeatures = async () => (safe ? undefined : (await readConfig(path)).features)

    let plugins = await discover()
    let catalog = createCatalog(definitionsIn(plugins.map(plugin => plugin.sand)), safe ? undefined : table.features)
    const wanted = (plugin: (typeof plugins)[number]) => plugin.options !== undefined && catalog.on(plugin.feature)
    const { switches, track, untrack, learnOwners } = createSwitches(() => plugins.filter(plugin => !wanted(plugin)))
    ctx.provide(pluginSwitches, switches)

    const running = new Map<string, Scope>()
    const latestStartedFirst = startOrder(ctx)
    const stop = async (ids: string[]) => {
      const stopping = [...running].filter(([id]) => ids.includes(id))
      for (const [id, scope] of latestStartedFirst(stopping)) {
        running.delete(id)
        untrack(id)
        await scope.dispose()
      }
    }
    let ownersKnown = false
    const sync = async () => {
      await stop(plugins.filter(plugin => !wanted(plugin)).map(plugin => plugin.id))
      for (const plugin of plugins) {
        const { id, dir, options, entry } = plugin
        if (running.has(id) || !options || !entry || !wanted(plugin)) continue
        try {
          const loaded = ctx.load(entry, options)
          running.set(id, loaded)
          track({ id, dir, scope: loaded })
        } catch (error) {
          ctx.report(error)
        }
      }
      if (ownersKnown || plugins.every(wanted)) return
      ownersKnown = true
      const declaring = plugins.filter(plugin => plugin.entry || runsNowhere(plugin.sand))
      learnOwners(await serviceOwners(declaring.map(plugin => [plugin.id, plugin.dir] as const)))
    }

    ctx.provide(features, {
      list: () => catalog.list(),
      on: id => catalog.on(id),
      async set(changes) {
        await writeFeatures(path, changes, catalog.onByDefault)
        catalog.choose(changes)
        await sync()
      },
      async refresh() {
        const replaced = plugins.filter(plugin => plugin.own)
        await stop(replaced.map(plugin => plugin.id))
        for (const plugin of replaced) evict(plugin.dir)
        plugins = await discover()
        catalog = createCatalog(definitionsIn(plugins.map(plugin => plugin.sand)), await chosenFeatures())
        ownersKnown = false
        await sync()
      },
    })
    await sync()
    ctx.effect(() => () => stop([...running.keys()]))
  },
})
