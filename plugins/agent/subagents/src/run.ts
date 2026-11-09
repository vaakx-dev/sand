import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { modelSettings, type SessionSettings } from '@sand/model/contract'
import { subModel } from '@sand/sub-model/contract'
import type { AgentsContext } from './context'
import type { AgentLimits, AgentRequest } from './contract'
import type { Resolve } from './layers'
import { childSettings } from './settings'
import { agentTitle } from './title'

export const createOpen = (ctx: AgentsContext, resolve: Resolve, limits: AgentLimits) => {
  const definitionOf = async (name: string | undefined, { cwd, project }: Session) => {
    if (name === undefined) return undefined
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". ${definitions.size ? `Available: ${[...definitions.keys()].join(', ')}` : 'Leave out agent for a plain one.'}`)
    return definition
  }

  const parentSettings = (parent: Session): SessionSettings | undefined => {
    const effective = ctx.get(modelSettings)?.effective(parent)
    return effective && { model: effective.model, effort: effective.effort, speed: effective.speed }
  }

  return async (request: AgentRequest) => {
    const { parent, task, label, origin } = request
    const definition = await definitionOf(request.agent, parent)
    const scope = limits.child(parent, definition?.name, definition?.tools)
    const sub = ctx.get(subModel)
    const tier = request.model || definition?.model ? undefined : definition?.tier
    const own = definition ?? {}
    const preset = tier && sub?.has(tier) ? { ...sub.settings(tier), ...own } : own
    const settings = childSettings(request, preset, parentSettings(parent), ctx.get(llm))
    const session = ctx.sessions.agent({ parent: parent.id, title: agentTitle(label, task), ...(origin && { origin }) })
    if (settings) ctx.get(modelSettings)?.update(session, settings)
    limits.give(session, scope)
    return session
  }
}

export type OpenAgent = ReturnType<typeof createOpen>
