import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { modelSettings, type SessionSettings } from '@sand/model/contract'
import { subModel } from '@sand/sub-model/contract'
import type { AgentsContext } from './context'
import type { AgentDefinition, AgentLimits, AgentMeta, AgentRequest, AgentResult } from './contract'
import type { Resolve } from './layers'
import { childSettings } from './settings'
import { slots } from './slots'
import { agentTitle } from './title'

export interface RunOptions {
  resolve: Resolve
  limits: AgentLimits
  maxAgents: number
}

export interface OpenedAgent {
  session: Session
  run(signal: AbortSignal): Promise<AgentResult>
  follow(task: string, signal: AbortSignal): Promise<AgentResult>
}

export const createRun = (ctx: AgentsContext, { resolve, limits, maxAgents }: RunOptions) => {
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

  const create = async (request: AgentRequest, definition: AgentDefinition, scope: AgentMeta) => {
    const { parent, task, label, origin } = request
    const sub = ctx.get(subModel)
    const tier = request.model || definition.model ? undefined : definition.tier
    const preset = tier && sub?.has(tier) ? { ...sub.settings(tier), ...definition } : definition
    const settings = childSettings(request, preset, parentSettings(parent), ctx.get(llm))
    const session = ctx.sessions.agent({ parent: parent.id, title: agentTitle(label, task), ...(origin && { origin }) })
    if (settings) ctx.get(modelSettings)?.update(session, settings)
    limits.give(session, scope)
    return session
  }

  const drive = async (session: Session, task: string, signal: AbortSignal): Promise<AgentResult> => {
    const release = await take(signal)
    try {
      return { ...(await ctx.turns.run(session, task, { origin: 'agent', signal })), session }
    } finally {
      release()
    }
  }

  const open = async (request: AgentRequest): Promise<OpenedAgent> => {
    const definition = await definitionOf(request.agent ?? 'general', request.parent)
    const session = await create(request, definition, limits.child(request.parent, definition.name, definition.tools))
    return {
      session,
      run: signal => drive(session, request.task, signal),
      follow: (task, signal) => drive(session, task, signal),
    }
  }

  return open
}
