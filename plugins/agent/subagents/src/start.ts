import type { Effort } from '@sand/accounts/contract'
import { type Message, type Session, textOf } from '@sand/chats/contract'
import { modelSettings, type Role, type SessionSettings } from '@sand/model/contract'
import type { AgentLimits } from '@sand/orchestrator/contract'
import { oneLine } from '@sand/util'
import type { AgentsContext } from './context'
import type { AgentDefinition } from './contract'
import { resolve as resolvePath } from 'node:path'
import type { Resolve } from './layers'
import { type Does, DOES_ROLES } from './does'
import { agentTitle } from './title'

export interface SubagentRequest {
  parent: Session
  call: string
  task: string
  label?: string
  agent?: string
  does?: Does
  effort?: Effort
  project?: string
  folder?: string
  pc?: string
  worktree?: boolean
}

const asking = new Set(['user', 'agent', 'bot', 'routine', 'cli', 'mcp', 'print'])

const requestLength = 600

const contextLinks = /\[[^\]]*\]\(sand-context:[^)]*\)/g

const withBackground = (task: string, request: string | undefined) =>
  request ? `${task}\n\n<background>\nThe agent asking is working on this request:\n${oneLine(request, requestLength)}\n</background>` : task

export const createStart = (ctx: AgentsContext, resolve: Resolve, limits: AgentLimits) => {
  const definitionOf = async (name: string | undefined, cwd: string | undefined, project: string | null | undefined) => {
    if (name === undefined) return undefined
    const definitions = await resolve(cwd, project)
    const definition = definitions.get(name)
    if (!definition) throw new Error(`Unknown agent "${name}". ${definitions.size ? `Available: ${[...definitions.keys()].join(', ')}` : 'Leave out agent for a plain one.'}`)
    return definition
  }

  const roleOf = (parent: Session, does: Does | undefined): Role => (parent.kind === 'bot' ? 'lead' : DOES_ROLES[does ?? 'build'])

  const presetOf = (role: Role, definition: AgentDefinition | undefined): SessionSettings =>
    definition?.model ? definition : (ctx.get(modelSettings)?.role(role) ?? {})

  const promptOf = (parent: Session, turn: string) => {
    const entry = parent.path().find(entry => entry.type === 'message' && entry.turn === turn && (entry.data as Message).role === 'user')
    return entry && textOf((entry.data as Message).content).replace(contextLinks, '').trim()
  }

  const workingOn = (parent: Session) => {
    const turn = ctx.turns.list(parent, undefined, 20).find(turn => asking.has(turn.origin))
    return turn && promptOf(parent, turn.id)
  }

  return async (request: SubagentRequest) => {
    const { parent, call, task, label, project, folder, pc, worktree } = request
    const from = { owner: parent.owner, id: parent.id }
    const definition = await definitionOf(request.agent, parent.cwd, project ?? parent.project)
    const scope = limits.child(parent, definition?.name, definition?.tools)
    const role = roleOf(parent, request.does ?? definition?.does)
    const preset = presetOf(role, definition)
    const effort = request.effort ?? definition?.effort ?? preset.effort
    return ctx.orchestrator.start({
      prompt: withBackground(task, workingOn(parent)),
      title: agentTitle(label, task),
      ...(project && { project }),
      ...(folder && { cwd: pc ? folder : resolvePath(parent.cwd, folder) }),
      ...(worktree && { worktree }),
      ...(preset.model && { model: preset.model }),
      ...(effort && { effort }),
      ...(preset.speed && { speed: preset.speed }),
      origin: 'agent',
      clientRequestId: `${from.id}:${call}`,
      from,
      subagent: { call, limits: { ...scope, role }, ...(pc && { pc }) },
    })
  }
}

export type StartSubagent = ReturnType<typeof createStart>
