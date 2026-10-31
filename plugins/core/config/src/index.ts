import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { cli, pluginSwitches, sandConfig } from './contract'
import { builtinPlugins, entryFor, userPlugins } from './find'
import { serviceOwners } from './off/owners'
import { createSwitches } from './off/switches'
import { optionsOf } from './plugins'
import { configPath, readConfig } from './read'

export default definePlugin({
  name: 'config',
  description: 'Finds the plugins that run in this place and loads them with their sand.toml settings',
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
      [...found].map(async ([id, dir]) => ({ id, dir, options: optionsOf(settings, id), entry: await entryFor(dir, place) })),
    )
    const turnedOff = plugins.filter(plugin => !plugin.options).map(({ id, dir }) => ({ id, dir }))
    const { switches, track, learnOwners } = createSwitches(turnedOff)
    ctx.provide(pluginSwitches, switches)

    for (const { id, dir, options, entry } of plugins) {
      if (!options || !entry) continue
      try {
        track({ id, dir, scope: ctx.load(entry, options) })
      } catch (error) {
        ctx.report(error)
      }
    }
    if (turnedOff.length) learnOwners(await serviceOwners(found))
  },
})
