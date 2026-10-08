import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { discover } from './discover'
import { loadModes } from './modes'
import { mounter } from './mount'
import { entries, locate } from './plugins'
import { isTable, readConfig } from './read'

export default definePlugin({
  name: 'config-toml',
  inject: ['cli'],
  config: z.object({
    modes_file: z.string(),
    resolve_from: z.string(),
    plugins_dir: z.string().optional(),
  }),
  async apply(ctx, config) {
    const global = join(ctx.cli.home, 'sand.toml')

    const setup = (await loadModes(config.modes_file))[ctx.cli.mode]
    if (!setup) throw new Error(`No plugin set for mode "${ctx.cli.mode}" in ${config.modes_file}`)
    const settings = await readConfig([global, join(ctx.cli.cwd, '.sand', 'sand.toml')])
    const folders = [join(ctx.cli.home, 'plugins'), join(ctx.cli.cwd, '.sand', 'plugins')]
    const found = await Promise.all(folders.map(discover))
    const mount = mounter(ctx, id => locate(id, config.resolve_from, config.plugins_dir))

    const { type, ...options } = isTable(settings.provider) ? settings.provider : {}
    if (typeof type !== 'string') throw new Error(`No [provider] configured in ${global}`)
    mount(`llm-${type}`, options)
    for (const [id, options] of entries([...setup.plugins, ...found.flat()], settings.plugins)) mount(id, options)
  },
})
