import type { Tool } from '@sand/tools/contract'
import { definePlugin, type Context } from 'drydock'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { listPlugins, showPlugin } from './report'

const skillDir = join(import.meta.dir, '..', 'skills', 'sand-plugins')
const registry = join(dirname(Bun.resolveSync('@sand/protocol', import.meta.dir)), 'registry.ts')

const input = z.object({
  name: z.string().optional().describe('Plugin or web extension name, for its details and errors'),
})

const pluginTool = (ctx: Context<'tools'>): Tool<typeof input> => ({
  name: 'plugin',
  description:
    "List sand's plugins and web extensions with their status. Pass a name for its errors, services, hooks and roles. Load the sand-plugins skill before writing a plugin.",
  input,
  run: ({ name }) => (name ? showPlugin(ctx, name) : listPlugins(ctx)),
})

export default definePlugin({
  name: 'extend',
  inject: ['tools'],
  uses: {
    skills: 'the agent gets no guide to writing plugins',
    webExtensions: 'the plugin tool shows no web extensions',
  },
  apply(ctx) {
    ctx.effect(() => ctx.tools.register(pluginTool(ctx)))
    ctx.watch('skills', skills => skills?.register(skillDir, { registry }))
  },
})
