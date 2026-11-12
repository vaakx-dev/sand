import { definePlugin, type Scope } from 'drydock'
import { join } from 'node:path'
import { cli, features, pluginSwitches, sandConfig } from './contract'
import { createCatalog } from './features/catalog'
import { definitionsIn, featureOf } from './features/definitions'
import { writeFeatures } from './features/toml'
import { builtinPlugins, entryIn, runsNowhere, sandOf, userPlugins } from './find'
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
    const user = !safe && place !== 'host'
    const found = new Map([...(await builtinPlugins(builtins)), ...(user ? await userPlugins(join(home, 'plugins'), settings) : [])])
    const plugins = await Promise.all(
      [...found].map(async ([id, dir]) => {
        const sand = await sandOf(dir)
        return { id, dir, sand, options: optionsOf(settings, id), entry: entryIn(dir, sand, place), feature: featureOf(sand) }
      }),
    )
    const catalog = createCatalog(definitionsIn(plugins.map(plugin => plugin.sand)), safe ? undefined : table.features)
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
      list: catalog.list,
      on: catalog.on,
      async set(changes) {
        await writeFeatures(path, changes, catalog.onByDefault)
        catalog.choose(changes)
        await sync()
      },
    })
    await sync()
    ctx.effect(() => () => stop([...running.keys()]))
  },
})
