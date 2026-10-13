import type { AgentDefinition, Agents } from './contract'
import { definePlugin, type Dispose } from 'drydock'
import { z } from 'zod'
import { agentLayers } from './layers'
import { createMeta } from './meta'
import { group, modelsTool } from './models'
import { restrictContext } from './restrict'
import { createRun } from './run'
import { agentTool } from './tool'

export default definePlugin({
  name: 'agents',
  inject: ['loop', 'paths', 'sessions', 'tools', 'watcher', 'backgroundJobs'],
  uses: {
    llm: 'agent definitions cannot set an effort level',
    instructions: 'sub-agents get no environment or project instructions in their prompt',
    modelSettings: 'sub-agents get no model name in their prompt',
    steering: 'running background agents cannot take messages',
    workerModel: 'worker agents like browser and web cannot start',
  },
  config: z.object({
    max_depth: z.number().int().min(0).default(6),
    max_agents: z.number().int().positive().default(32),
  }),
  apply(ctx, config) {
    const defined = new Map<string, AgentDefinition>()
    const meta = createMeta()
    let unregister: Dispose | undefined
    let generation = 0
    const refresh = async () => {
      const current = ++generation
      const list = [...(await resolve()).values()]
      if (current !== generation) return
      void unregister?.()
      unregister = ctx.tools.register(agentTool(ctx, run.open, list))
    }

    const efforts = ctx.llm?.levels?.().map(level => level.id) ?? []
    const resolve = agentLayers(ctx, defined, efforts, () => void refresh())
    const run = createRun(ctx, { resolve, meta, maxDepth: config.max_depth, maxAgents: config.max_agents })

    const agents: Agents = {
      define(definition) {
        defined.set(definition.name, definition)
        void refresh()
        return () => {
          if (defined.get(definition.name) === definition) defined.delete(definition.name)
          void refresh()
        }
      },
      definitions: async (cwd, project) => [...(await resolve(cwd, project)).values()],
      run: run.run,
    }

    ctx.provide('agents', agents)
    ctx.effect(() =>
      ctx.tools.group({ name: group, label: 'Agents', summary: 'run workflows of many subagents, and list the models agents can use', load: 'on-demand' }),
    )
    ctx.effect(() => ctx.tools.register(modelsTool(ctx)))
    ctx.watch('llm', () => void refresh())
    ctx.on('llm.models', () => void refresh())
    ctx.effect(() => () => {
      generation++
      void unregister?.()
    })
    restrictContext(ctx, resolve, meta, config.max_depth)
  },
})
