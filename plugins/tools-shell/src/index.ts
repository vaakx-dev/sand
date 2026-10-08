import { definePlugin } from 'drydock'
import { z } from 'zod'
import { detect } from './detect'
import { shellTool } from './tool'

export default definePlugin({
  name: 'tools-shell',
  inject: ['tools'],
  config: z.object({
    shell: z.string().optional(),
    timeout_ms: z.number().int().positive().default(120_000),
    max_output: z.number().int().positive().default(30_000),
  }),
  apply(ctx, config) {
    const tool = shellTool(detect(config.shell), config.timeout_ms, config.max_output)
    ctx.effect(() => ctx.tools.register(tool))
  },
})
