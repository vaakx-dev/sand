import { llm } from '@sand/accounts/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { inject } from './context'
import { agentLayers } from './layers'
import { createMeta } from './meta'
import { group, modelsTool } from './models'
import { restrictContext } from './restrict'
import { createRun } from './run'
import { agentTool } from './tool'

export default definePlugin({
  name: 'subagents',
  description: 'Sub-agents: the agent tool, agent definitions from builtins, ~/.sand/agents and .sand/agents, tool limits and the models tool',
  inject,
  config: z.object({
    max_depth: z.number().int().min(0).default(6),
    max_agents: z.number().int().positive().default(32),
  }),
  apply(ctx, config) {
    const meta = createMeta()
    const efforts = () => ctx.get(llm)?.levels?.().map(level => level.id) ?? []
    const resolve = agentLayers(ctx, efforts)
    const run = createRun(ctx, { resolve, meta, maxDepth: config.max_depth, maxAgents: config.max_agents })
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Agents', summary: 'list the models agents can use', load: 'on-demand' }))
    ctx.effect(() => ctx.tools.register(agentTool(ctx, run.open)))
    ctx.effect(() => ctx.tools.register(modelsTool(ctx)))
    restrictContext(ctx, resolve, meta, config.max_depth)
  },
})
