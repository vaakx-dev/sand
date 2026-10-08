import type { AgentDefinition, Agents } from '@sand/protocol'
import { definePlugin, type Dispose } from 'drydock'
import { sandHome, workingFolder } from '@sand/host'
import { join } from 'node:path'
import { z } from 'zod'
import { agentsUI } from './command'
import { builtins, loadDefinitions } from './definitions'
import { createJobs } from './jobs'
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
  async apply(ctx, config) {
    const definitions = new Map<string, AgentDefinition>()
    const meta = createMeta()
    const jobs = createJobs(ctx)
    let unregister: Dispose | undefined
    const refresh = () => {
      void unregister?.()
      unregister = ctx.tools.register(agentTool(agents, ctx.llm))
    }

    const agents: Agents = {
      define(definition) {
        definitions.set(definition.name, definition)
        refresh()
        return () => {
          if (definitions.get(definition.name) === definition) definitions.delete(definition.name)
          refresh()
        }
      },
      definitions: () => [...definitions.values()],
      run: createRun(ctx, { definitions, meta, maxDepth: config.max_depth, maxAgents: config.max_agents }),
      background: jobs.start,
      jobs: jobs.list,
    }

    const folders = [join(sandHome(ctx), 'agents'), join(workingFolder(ctx), '.sand', 'agents')]
    const efforts = ctx.llm?.levels?.().map(level => level.id) ?? []
    const loaded = await loadDefinitions(folders, efforts, error => ctx.report(error))
    for (const definition of [...builtins, ...loaded]) definitions.set(definition.name, definition)

    ctx.provide('agents', agents)
    ctx.on('turn.stop', (session, _result, signal) => (session.kind === 'agent' ? jobs.idle(session, signal).then(() => undefined) : undefined))
    serveJobs(ctx, agents)
    ctx.plugin(agentsUI)
    ctx.watch('llm', () => refresh())
    ctx.effect(() => () => unregister?.())
    restrictContext(ctx, definitions, meta, config.max_depth)
  },
})
