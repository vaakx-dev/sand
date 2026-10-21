import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { cli, sandConfig } from './contract'
import { builtinPlugins, entryFor, userPlugins } from './find'
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
    const entries = await Promise.all([...found].map(async ([id, dir]) => [optionsOf(settings, id), await entryFor(dir, place)] as const))

    for (const [options, entry] of entries) {
      if (!options || !entry) continue
      try {
        ctx.load(entry, options)
      } catch (error) {
        ctx.report(error)
      }
    }
  },
})
