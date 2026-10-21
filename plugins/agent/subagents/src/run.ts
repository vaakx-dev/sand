import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { modelSettings, type SessionSettings } from '@sand/model/contract'
import { instructions } from '@sand/prompt/contract'
import type { AgentsContext } from './context'
import type { AgentDefinition, AgentRequest, AgentResult } from './contract'
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

export const createRun = (ctx: AgentsContext, { resolve, meta, maxDepth, maxAgents }: RunOptions) => {
  const take = slots(maxAgents)

  const definitionOf = async (name: string, { cwd, project }: Session) => {
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". Available: ${[...definitions.keys()].join(', ')}`)
    return definition
  }

  const parentSettings = (parent: Session): SessionSettings | undefined => {
    const effective = ctx.get(modelSettings)?.effective(parent)
    return effective && { model: effective.model, effort: effective.effort, speed: effective.speed }
  }

  const create = async (request: AgentRequest, definition: AgentDefinition, parentMeta: AgentMeta | undefined) => {
    const { parent, task, label, origin } = request
    const settings = childSettings(request, definition, parentSettings(parent), ctx.get(llm))
    const session = ctx.sessions.agent({ parent: parent.id, title: agentTitle(label, task), ...(origin && { origin }) })
    if (settings) ctx.get(modelSettings)?.update(session, settings)
    const model = ctx.get(modelSettings)?.effective(session).model
    const tools = narrowed(parentMeta?.tools, definition.tools)
    const depth = (parentMeta?.depth ?? 0) + 1
    session.append('agent', { name: definition.name, depth, ...(tools && { tools }) } satisfies AgentMeta)
    session.append('system', await compose(definition, session, ctx.get(instructions), model))
    return session
  }

  const drive = async (session: Session, request: AgentRequest, release: Release, signal?: AbortSignal): Promise<AgentResult> => {
    try {
      return { ...(await ctx.loop.run(session, request.task, signal)), session }
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
