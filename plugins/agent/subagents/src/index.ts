import { llm } from '@sand/accounts/contract'
import { agentLimits } from '@sand/orchestrator/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { inject } from './context'
import { agentLayers } from './layers'
import { createLimits } from './limits'
import { createMeta } from './meta'
import { restrictContext } from './restrict'
import { createStart } from './start'
import { agentPrompt } from './system'
import { agentTool } from './tool'

export default definePlugin({
  name: 'subagents',
  description: 'Subagents: the agent tool, agent definitions from ~/.sand/agents and .sand/agents and tool limits',
  inject,
  config: z.object({
    max_depth: z.number().int().min(0).default(6),
  }),
  apply(ctx, config) {
    const meta = createMeta()
    const efforts = () => ctx.get(llm)?.levels?.().map(level => level.id) ?? []
    const resolve = agentLayers(ctx, efforts)
    const limits = createLimits(meta, config.max_depth)
    ctx.provide(agentLimits, limits)
    ctx.effect(() => ctx.tools.register(agentTool(ctx, createStart(ctx, resolve, limits))))
    restrictContext(ctx, resolve, meta, config.max_depth)
    agentPrompt(ctx, resolve, meta)
  },
})
