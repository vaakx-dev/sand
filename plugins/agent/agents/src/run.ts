import type { Session } from '@sand/sessions-sqlite/contract'
import type { AgentDefinition, AgentRequest, AgentResult } from './contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { AgentMeta, Meta } from './meta'
import { childSettings } from './settings'
import { slots, type Release } from './slots'
import { compose } from './system'
import { agentTitle } from './title'

export interface RunOptions {
  resolve: Resolve
  meta: Meta
  maxDepth: number
  maxAgents: number
}

export interface OpenedAgent {
  session: Session
  run(signal?: AbortSignal): Promise<AgentResult>
  follow(task: string, signal: AbortSignal): Promise<AgentResult>
}

const narrowed = (inherited: string[] | undefined, own: string[] | undefined) => {
  if (!inherited) return own
  return own ? own.filter(tool => inherited.includes(tool)) : inherited
}

export const createRun = (ctx: Context<'loop' | 'sessions'>, { resolve, meta, maxDepth, maxAgents }: RunOptions) => {
  const take = slots(maxAgents)

  const definitionOf = async (name: string, { cwd, project }: AgentRequest['parent']) => {
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". Available: ${[...definitions.keys()].join(', ')}`)
    return definition
  }

  const create = async (request: AgentRequest, definition: AgentDefinition, parentMeta: AgentMeta | undefined) => {
    const { parent, task, label, origin } = request
    const settings = childSettings(request, definition, ctx.llm)
    const model = ctx.modelSettings?.resolve(settings ?? {}).model
    const session = ctx.sessions.create({
      cwd: parent.cwd,
      project: parent.project,
      title: agentTitle(label, task),
      parent: parent.id,
      origin,
      kind: 'agent',
    })
    const tools = narrowed(parentMeta?.tools, definition.tools)
    const depth = (parentMeta?.depth ?? 0) + 1
    const system = await compose(definition, session, ctx.instructions, model)
    session.append('agent', { name: definition.name, depth, system, ...(tools && { tools }) } satisfies AgentMeta)
    if (settings) session.append('settings', settings)
    return session
  }

  const drive = async (session: Session, request: AgentRequest, release: Release, signal?: AbortSignal): Promise<AgentResult> => {
    try {
      ctx.emit('agent.start', session, request)
      const result = { ...(await ctx.loop.run(session, request.task, signal)), session }
      ctx.emit('agent.end', session, result)
      return result
    } finally {
      release()
    }
  }

  const open = async (request: AgentRequest): Promise<OpenedAgent> => {
    const definition = await definitionOf(request.agent ?? 'general', request.parent)
    const parentMeta = meta(request.parent)
    if ((parentMeta?.depth ?? 0) >= maxDepth) throw new Error(`Agents can only nest ${maxDepth} levels deep`)
    const release = await take(request.wait ?? false, request.signal)
    const session = await create(request, definition, parentMeta).catch(error => {
      release()
      throw error
    })
    return {
      session,
      run: signal => drive(session, request, release, signal),
      follow: async (task, signal) => drive(session, { ...request, task }, await take(false), signal),
    }
  }

  return {
    open,
    run: async (request: AgentRequest) => (await open(request)).run(request.signal),
  }
}
