import { databaseBusy, errorMessage } from '@sand/util'
import { coreBuild, recordAddonFault } from '@sand/util/release'
import { definePlugin, evict, type Scope } from 'drydock'
import { join } from 'node:path'
import { cli, definitionsIn, featureOf, features, pluginStates, pluginSwitches, sandConfig } from './contract'
import { createCatalog } from './features/catalog'
import { addonPlugins, builtinPlugins, entryIn, runsNowhere, sandOf, userPlugins } from './find'
import { serviceOwners } from './off/owners'
import { createSwitches } from './off/switches'
import { startOrder } from './order'
import { optionsOf } from './plugins'
import { readConfig } from './read'
import { setTomlValues, type TomlValues } from './toml'

const BUSY_RETRY_MS = 5_000

export default definePlugin({
  name: 'config',
  description: 'Finds the plugins that run in this place and loads them with their sand.toml settings, leaving out the plugins of features that are turned off',
  inject: { cli },
  async apply(ctx) {
    const { home, safe, sandbox, place, builtins } = ctx.cli
    const path = join(home, 'sand.toml')
    const table = await readConfig(path)
    const set = (table: string[], values: TomlValues) => setTomlValues(path, table, values)
    ctx.provide(sandConfig, { path, section: name => table[name], set })

    const settings = safe ? undefined : table.plugins
    const userRoot = join(home, 'plugins')
    const build = await coreBuild(builtins)
    const ownFolders = async () => {
      if (safe) return []
      return place === 'host' ? addonPlugins(userRoot, build) : userPlugins(userRoot, settings, build)
    }
    const discover = async () => {
      const own = await ownFolders()
      const mine = new Set(own.map(([id]) => id))
      const found = new Map([...(await builtinPlugins(builtins)), ...own].map(([id, dir, addon]) => [id, { dir, addon }]))
      return Promise.all(
        [...found].map(async ([id, { dir, addon }]) => {
          const sand = await sandOf(dir)
          return { id, dir, addon, sand, own: mine.has(id), options: optionsOf(settings, id), entry: entryIn(dir, sand, place), feature: featureOf(sand), opensNetwork: sand.network === true }
        }),
      )
    }
    const chosenFeatures = async () => (safe ? undefined : (await readConfig(path)).features)

    let plugins = await discover()
    let catalog = createCatalog(definitionsIn(plugins.map(plugin => plugin.sand)), safe ? undefined : table.features)
    const faulted = new Set<string>()
    const wanted = (plugin: (typeof plugins)[number]) =>
      plugin.options !== undefined && catalog.on(plugin.feature) && !(plugin.addon && faulted.has(plugin.addon)) && !(sandbox && plugin.opensNetwork)
    const fault = async (addon: string, error: string) => {
      if (faulted.has(addon)) return
      faulted.add(addon)
      console.error(`The add-on ${addon} did not load, so sand turned it off until it is updated or reinstalled: ${error}`)
      await recordAddonFault(join(userRoot, addon), { build, error, at: Date.now() })
      await sync()
    }
    const { switches, track, untrack, learnOwners } = createSwitches({ turnedOff: () => plugins.filter(plugin => !wanted(plugin)), fault })
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
    let stopped = false
    let retrying: Timer | undefined
    const busyScopes = () => [...running.values()].filter(scope => scope.status === 'failed' && databaseBusy(scope.error))
    const retry = (scopes: Scope[]) => {
      clearTimeout(retrying)
      retrying = setTimeout(async () => {
        await Promise.all(scopes.map(scope => scope.reload()))
        await ctx.settled()
        await faultBroken()
      }, BUSY_RETRY_MS)
    }
    const faultBroken = async () => {
      if (stopped) return
      const busy = busyScopes()
      if (busy.length) retry(busy)
      const waiting = new Set(busy.map(scope => scope.name))
      const broken = pluginStates(ctx).flatMap(({ name, addon, problem }) =>
        addon && problem && !waiting.has(name) ? [{ addon, error: `${name}: ${problem}` }] : [],
      )
      for (const { addon, error } of broken) await fault(addon, error)
    }
    const sync = async (): Promise<void> => {
      await stop(plugins.filter(plugin => !wanted(plugin)).map(plugin => plugin.id))
      for (const plugin of plugins) {
        const { id, dir, addon, options, entry } = plugin
        if (running.has(id) || !options || !entry || !wanted(plugin)) continue
        try {
          const loaded = ctx.load(entry, options)
          running.set(id, loaded)
          track({ id, dir, addon, scope: loaded })
        } catch (error) {
          if (addon) void fault(addon, `${id}: ${errorMessage(error)}`)
          else ctx.report(error)
        }
      }
      void ctx.settled().then(faultBroken)
      if (ownersKnown || plugins.every(wanted)) return
      ownersKnown = true
      const declaring = plugins.filter(plugin => plugin.entry || runsNowhere(plugin.sand))
      learnOwners(await serviceOwners(declaring.map(plugin => [plugin.id, plugin.dir] as const)))
    }

    const chosenOnly = (changes: Record<string, boolean>) =>
      Object.fromEntries(Object.entries(changes).map(([id, on]) => [id, on === catalog.onByDefault(id) ? undefined : on]))

    ctx.provide(features, {
      list: () => catalog.list(),
      on: id => catalog.on(id),
      async set(changes) {
        await set(['features'], chosenOnly(changes))
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
    ctx.effect(() => () => {
      stopped = true
      clearTimeout(retrying)
      return stop([...running.keys()])
    })
  },
})
