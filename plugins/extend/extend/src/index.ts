import type { Tool } from '@sand/tools/contract'
import { definePlugin, type Context } from 'drydock'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { describe } from './describe'

const skillDir = join(import.meta.dir, '..', 'skills', 'sand-plugins')
const registry = join(dirname(Bun.resolveSync('@sand/protocol', import.meta.dir)), 'registry.ts')

const input = z.object({
  name: z.string().optional().describe('Plugin name, for its details and errors'),
})

const pluginTool = (ctx: Context<'tools'>): Tool<typeof input> => {
  const plugins = () => ctx.scopes().filter(scope => scope.kind === 'plugin')

  return {
    name: 'plugin',
    description:
      "List sand's plugins and their status, or pass a name for one plugin's errors, services and hooks. To write a plugin, load the sand-plugins skill first.",
    input,
    run({ name }) {
      if (!name) return plugins().map(scope => describe(ctx, scope).split('\n')[0]).join('\n')
      const scope = plugins().find(candidate => candidate.name === name)
      if (!scope) throw new Error(`No plugin named ${name}`)
      return describe(ctx, scope)
    },
  }
}

export default definePlugin({
  name: 'extend',
  inject: ['tools'],
  uses: { skills: 'the agent gets no guide to writing plugins' },
  apply(ctx) {
    ctx.effect(() => ctx.tools.register(pluginTool(ctx)))
    ctx.watch('skills', skills => skills?.register(skillDir, { registry }))
  },
})
