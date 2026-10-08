import { expandHome, sandHome } from '@sand/host'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { workflowTool } from './tool'

export default definePlugin({
  name: 'workflows',
  inject: ['agents', 'tools'],
  config: z.object({
    dir: z.string().optional(),
  }),
  apply(ctx, config) {
    const root = config.dir ? expandHome(config.dir) : join(sandHome(ctx), 'workflows')
    ctx.effect(() => ctx.tools.register(workflowTool(ctx, root)))
  },
})
