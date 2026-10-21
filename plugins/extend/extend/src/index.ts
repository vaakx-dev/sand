import { cli } from '@sand/config/contract'
import { skills } from '@sand/skills/contract'
import { type Tool, tools } from '@sand/tools/contract'
import { type Context, definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { listPlugins, showPlugin } from './report'

const skillDir = join(import.meta.dir, '..', 'skills', 'sand-plugins')

const input = z.object({
  name: z.string().optional().describe('Plugin or web extension name, for its details and errors'),
})

const pluginTool = (ctx: Context): Tool<typeof input> => ({
  name: 'plugin',
  group: 'plugins',
  description:
    "List sand's plugins and web extensions with their status. Pass a name for its errors, services, hooks and the services it waits for. Load the sand-plugins skill before writing a plugin.",
  input,
  run: ({ name }) => (name ? showPlugin(ctx, name) : listPlugins(ctx)),
})

export default definePlugin({
  name: 'extend',
  inject: { tools, cli },
  apply(ctx) {
    ctx.effect(() => ctx.tools.group({ name: 'plugins', label: 'sand plugins', summary: "inspect sand's plugins and web extensions and their errors", load: 'on-demand' }))
    ctx.effect(() => ctx.tools.register(pluginTool(ctx)))
    ctx.watch(skills, found => found?.register(skillDir, { plugins: ctx.cli.builtins }))
  },
})
