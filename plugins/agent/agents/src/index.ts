import type { AgentDefinition, Agents } from '@sand/protocol'
import { definePlugin, type Dispose } from 'drydock'
import { z } from 'zod'
import { agentsUI } from './command'
import { createJobs } from './jobs'
import { agentLayers } from './layers'
import { createMeta } from './meta'
import { restrictContext } from './restrict'
import { createRun } from './run'
import { serveJobs } from './serve'
import { agentTool } from './tool'

export default definePlugin({
  name: 'agents',
  inject: ['loop', 'sessions', 'tools'],
  config: z.object({
    max_depth: z.number().int().min(0).default(6),
    max_agents: z.number().int().positive().default(32),
  }),
  apply(ctx, config) {
    const defined = new Map<string, AgentDefinition>()
    const meta = createMeta()
    const jobs = createJobs(ctx)
    let unregister: Dispose | undefined
    let generation = 0
    const refresh = async () => {
      const current = ++generation
      const list = [...(await resolve()).values()]
      if (current !== generation) return
      void unregister?.()
      unregister = ctx.tools.register(agentTool(agents, list, ctx.llm))
    }

    const efforts = ctx.llm?.levels?.().map(level => level.id) ?? []
    const resolve = agentLayers(ctx, defined, efforts, () => void refresh())

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
      run: createRun(ctx, { resolve, meta, maxDepth: config.max_depth, maxAgents: config.max_agents }),
      background: jobs.start,
      jobs: jobs.list,
    }

    ctx.provide('agents', agents)
    ctx.on('turn.stop', (session, _result, signal) => (session.kind === 'agent' ? jobs.idle(session, signal).then(() => undefined) : undefined))
    serveJobs(ctx, agents)
    ctx.plugin(agentsUI)
    ctx.watch('llm', () => void refresh())
    ctx.on('llm.models', () => void refresh())
    ctx.effect(() => () => {
      generation++
      void unregister?.()
    })
    restrictContext(ctx, resolve, meta, config.max_depth)
  },
})
