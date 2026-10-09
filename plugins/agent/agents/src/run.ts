import type { AgentDefinition, AgentRequest, AgentResult } from '@sand/protocol'
import { toolNotes } from '@sand/host'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { AgentMeta, Meta } from './meta'
import { childSettings } from './settings'
import { slots } from './slots'
import { compose } from './system'
import { agentTitle } from './title'

export interface RunOptions {
  resolve: Resolve
  meta: Meta
  maxDepth: number
  maxAgents: number
}

export const createRun = (ctx: Context<'loop' | 'sessions'>, { resolve, meta, maxDepth, maxAgents }: RunOptions) => {
  const take = slots(maxAgents)

  const definitionOf = async (name: string, { cwd, project }: AgentRequest['parent']) => {
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". Available: ${[...definitions.keys()].join(', ')}`)
    return definition
  }

  const open = async (request: AgentRequest, definition: AgentDefinition, depth: number) => {
    const { parent, task, label, origin } = request
    const system = await compose(definition, parent, toolNotes(ctx.tools))
    const session = ctx.sessions.create({
      cwd: parent.cwd,
      project: parent.project,
      title: agentTitle(label, task),
      parent: parent.id,
      origin,
      kind: 'agent',
    })
    session.append('agent', { name: definition.name, depth, system } satisfies AgentMeta)
    const settings = childSettings(request, definition, ctx.llm)
    if (settings) session.append('settings', settings)
    return session
  }

  return async (request: AgentRequest): Promise<AgentResult> => {
    const definition = await definitionOf(request.agent ?? 'general', request.parent)
    const depth = (meta(request.parent)?.depth ?? 0) + 1
    if (depth > maxDepth) throw new Error(`Agents can only nest ${maxDepth} levels deep`)
    const release = await take(request.wait ?? false, request.signal)
    try {
      const session = await open(request, definition, depth)
      ctx.emit('agent.start', session, request)
      const result = { ...(await ctx.loop.run(session, request.task, request.signal)), session }
      ctx.emit('agent.end', session, result)
      return result
    } finally {
      release()
    }
  }
}
