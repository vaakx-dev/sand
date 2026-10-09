import { expandHome } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { workflowTool } from './tool'

export default definePlugin({
  name: 'workflows',
  inject: ['agents', 'cli', 'tools'],
  config: z.object({
    dir: z.string().optional(),
  }),
  apply(ctx, config) {
    const { home } = ctx.cli
    const root = config.dir ? expandHome(config.dir, home) : join(home, 'workflows')
    ctx.effect(() => ctx.tools.register(workflowTool(ctx, root)))
  },
})
