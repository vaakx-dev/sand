import type { Session } from '@sand/chats/contract'
import { modelSettings, type SessionSettings } from '@sand/model/contract'
import { subModel } from '@sand/sub-model/contract'
import type { AgentsContext } from './context'
import type { AgentDefinition, AgentLimits, AgentMeta, AgentRequest, AgentResult } from './contract'
import type { Resolve } from './layers'
import { slots } from './slots'
import { agentTitle } from './title'

export interface RunOptions {
  resolve: Resolve
  limits: AgentLimits
  maxAgents: number
}

export interface OpenedAgent {
  session: Session
  model?: string
  run(signal: AbortSignal): Promise<AgentResult>
  follow(task: string, signal: AbortSignal): Promise<AgentResult>
}

export const createRun = (ctx: AgentsContext, { resolve, limits, maxAgents }: RunOptions) => {
  const take = slots(maxAgents)

  const definitionOf = async (name: string | undefined, { cwd, project }: Session) => {
    if (name === undefined) return undefined
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". ${definitions.size ? `Available: ${[...definitions.keys()].join(', ')}` : 'Leave out agent for a plain one.'}`)
    return definition
  }

  const childSettings = (parent: Session, asked: SessionSettings) => {
    const settings = ctx.get(modelSettings)
    const inherited = settings?.effective(parent)
    const matched = settings?.match(asked, inherited?.model)
    return inherited && { model: inherited.model, effort: inherited.effort, speed: inherited.speed, ...matched }
  }

  const create = async (request: AgentRequest, definition: AgentDefinition | undefined, scope: AgentMeta) => {
    const { parent, task, label, origin } = request
    const sub = ctx.get(subModel)
    const tier = request.model || definition?.model ? undefined : definition?.tier
    const own = definition ?? {}
    const preset: SessionSettings = tier && sub?.has(tier) ? { ...sub.settings(tier), ...own } : own
    const settings = childSettings(parent, { model: request.model ?? preset.model, effort: request.effort ?? preset.effort, speed: preset.speed })
    const session = ctx.sessions.agent({ parent: parent.id, title: agentTitle(label, task), ...(origin && { origin }) })
    if (settings) ctx.get(modelSettings)?.change(session, settings)
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
    const definition = await definitionOf(request.agent, request.parent)
    const session = await create(request, definition, limits.child(request.parent, definition?.name, definition?.tools))
    return {
      session,
      model: ctx.get(modelSettings)?.effective(session).model,
      run: signal => drive(session, request.task, signal),
      follow: (task, signal) => drive(session, task, signal),
    }
  }

  return open
}
