import type { Effort } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { type Level, modelSettings, type SessionSettings } from '@sand/model/contract'
import type { AgentLimits } from '@sand/orchestrator/contract'
import type { AgentsContext } from './context'
import type { AgentDefinition } from './contract'
import { resolve as resolvePath } from 'node:path'
import type { Resolve } from './layers'
import { agentTitle } from './title'

export interface SubagentRequest {
  parent: Session
  call: string
  task: string
  label?: string
  agent?: string
  model?: string
  effort?: Effort
  level?: Level
  project?: string
  folder?: string
  pc?: string
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

  const levelOf = (request: SubagentRequest, definition: AgentDefinition | undefined) =>
    request.model ? undefined : (request.level ?? (definition?.model ? undefined : definition?.level))

  const presetOf = (level: Level | undefined, definition: AgentDefinition | undefined): SessionSettings =>
    level ? (ctx.get(modelSettings)?.level(level) ?? {}) : (definition ?? {})

  return async (request: SubagentRequest) => {
    const { parent, call, task, label, project, folder, pc, worktree } = request
    const from = { owner: parent.owner, id: parent.id }
    const definition = await definitionOf(request.agent, parent.cwd, project ?? parent.project)
    const scope = limits.child(parent, definition?.name, definition?.tools)
    const level = levelOf(request, definition)
    const preset = presetOf(level, definition)
    const model = request.model ?? preset.model
    const effort = request.effort ?? preset.effort
    return ctx.orchestrator.start({
      prompt: task,
      title: agentTitle(label, task),
      ...(project && { project }),
      ...(folder && { cwd: pc ? folder : resolvePath(parent.cwd, folder) }),
      ...(worktree && { worktree }),
      ...(model && { model }),
      ...(effort && { effort }),
      ...(preset.speed && { speed: preset.speed }),
      origin: 'agent',
      clientRequestId: `${from.id}:${call}`,
      from,
      subagent: { call, limits: { ...scope, ...(level && { level }) }, ...(pc && { pc }) },
    })
  }
}

export type StartSubagent = ReturnType<typeof createStart>
