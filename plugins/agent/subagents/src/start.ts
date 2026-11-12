import type { Effort } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { AgentLimits } from '@sand/orchestrator/contract'
import { subModel } from '@sand/sub-model/contract'
import type { AgentsContext } from './context'
import type { AgentDefinition } from './contract'
import type { Resolve } from './layers'
import { agentTitle } from './title'

export interface SubagentRequest {
  from: ConversationRef
  parent?: Session
  call: string
  task: string
  label?: string
  agent?: string
  model?: string
  effort?: Effort
  project?: string
  worktree?: boolean
}

export const createStart = (ctx: AgentsContext, resolve: Resolve, limits: AgentLimits) => {
  const definitionOf = async (name: string | undefined, cwd: string | undefined, project: string | null | undefined) => {
    if (name === undefined) return undefined
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". ${definitions.size ? `Available: ${[...definitions.keys()].join(', ')}` : 'Leave out agent for a plain one.'}`)
    return definition
  }

  const presetOf = (request: SubagentRequest, definition: AgentDefinition | undefined): SessionSettings => {
    const sub = ctx.get(subModel)
    const tier = request.model || definition?.model ? undefined : definition?.tier
    const own = definition ?? {}
    return tier && sub?.has(tier) ? { ...sub.settings(tier), ...own } : own
  }

  return async (request: SubagentRequest) => {
    const { from, parent, call, task, label, project, worktree } = request
    const definition = await definitionOf(request.agent, parent?.cwd, project ?? parent?.project)
    const scope = limits.child(parent, definition?.name, definition?.tools)
    const preset = presetOf(request, definition)
    const model = request.model ?? preset.model
    const effort = request.effort ?? preset.effort
    return ctx.orchestrator.start(
      {
        prompt: task,
        title: agentTitle(label, task),
        ...(project && { project }),
        ...(worktree && { worktree }),
        ...(model && { model }),
        ...(effort && { effort }),
        ...(preset.speed && { speed: preset.speed }),
        origin: 'agent',
        clientRequestId: `${from.id}:${call}`,
        from,
        subagent: { call },
      },
      session => limits.give(session, scope),
    )
  }
}

export type StartSubagent = ReturnType<typeof createStart>
