import { definePlugin } from 'drydock'
import { z } from 'zod'
import type {} from './contract'
import { detect } from './detect'
import { shellEnv } from './env'
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
    const env = shellEnv()
    ctx.provide('shellEnv', env.service)
    const tool = shellTool(detect(config.shell), config.timeout_ms, config.max_output, env.values)
    ctx.effect(() => ctx.tools.register(tool))
  },
})
