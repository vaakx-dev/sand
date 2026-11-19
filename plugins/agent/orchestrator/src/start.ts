import type { Session } from '@sand/chats/contract'
import type { ConversationRef } from '@sand/engine/contract'
import type { SessionSettings } from '@sand/model/contract'
import { worktrees } from '@sand/worktrees/contract'
import { existsSync } from 'node:fs'
import type { OrchestratorContext } from './context'
import { type AgentMeta, agentLimits, failure, type Sent, type StartInput, type SubagentStart, subagentStarted } from './contract'
import type { Owners } from './owners'
import type { Pcs } from './pcs'
import type { Receipts } from './receipts'
import { matchSettings } from './settings'
import type { Starters } from './starters'

const folderOf = (ctx: OrchestratorContext, { cwd, project }: Pick<StartInput, 'cwd' | 'project'>) => {
  if ((cwd === undefined) === (project === undefined)) throw failure('invalid_request', 'Give either cwd, project or quick')
  if (cwd !== undefined) {
    if (!existsSync(cwd)) throw failure('invalid_request', `${cwd} is not a folder on this PC`)
    return { cwd }
  }
  const copy = ctx.projectFiles.copies().find(candidate => candidate.project === project)
  if (!copy) throw failure('not_found', `Project ${project} has no folder on this PC`)
  return { cwd: copy.path, project: copy.project }
}

const wantsWorktree = ({ worktree, branch, base }: StartInput) => Boolean(worktree || branch || base)

const inWorktree = async (ctx: OrchestratorContext, cwd: string, { branch, base }: StartInput, open: Open) => {
  const found = ctx.get(worktrees)
  if (!found) throw failure('invalid_request', 'Worktrees are turned off')
  return ctx.sessions.require((await found.thread({ cwd, ...(branch && { branch }), ...(base && { from: base }), open })).id)
}

type Open = (cwd: string, project?: string | null) => Session

export type Adopt = (session: Session) => void

const parentOf = (ctx: OrchestratorContext, { from }: Pick<StartInput, 'from'>) => from && ctx.sessions.open(from.id)

const inheritedSettings = (ctx: OrchestratorContext, parent: Session | undefined): SessionSettings => {
  if (!parent) return {}
  const { model, effort, speed } = ctx.modelSettings.effective(parent)
  return { ...(model && { model }), ...(effort && { effort }), speed }
}

const starterOf = ({ from }: StartInput) => {
  if (!from) throw failure('invalid_request', 'A subagent needs the thread or bot that starts it')
  return from
}

export const createStart = (ctx: OrchestratorContext, receipts: Receipts, starters: Starters, owners: Owners, pcs: Pcs) => {
  const opening = new Map<string, Promise<Session>>()

  const giveLimits =
    (limits: AgentMeta): Adopt =>
    session =>
      ctx.get(agentLimits)?.give(session, limits)

  const opener = (input: StartInput): Open => {
    const { subagent, title } = input
    if (!subagent) return (cwd, project) => ctx.sessions.thread(cwd, project === undefined ? undefined : { project })
    const from = starterOf(input)
    return (cwd, project) => ctx.sessions.agent({ parent: from.id, cwd, project, title: title ?? '', origin: subagent.call })
  }

  const homeOf = (from: ConversationRef) => {
    const project = owners.home(from)
    if (project) return folderOf(ctx, { project })
    const starter = parentOf(ctx, { from })
    return starter && { cwd: starter.cwd, project: starter.project }
  }

  const folderFor = ({ from, cwd, project }: StartInput) => {
    const placed = from && cwd === undefined && project === undefined ? homeOf(from) : undefined
    return placed ?? folderOf(ctx, { cwd, project })
  }

  const inFolder = (input: StartInput) => {
    const { cwd, project } = folderFor(input)
    const open = opener(input)
    return wantsWorktree(input) ? inWorktree(ctx, cwd, input, open) : open(cwd, project)
  }

  const quickThread = (input: StartInput) => {
    if (input.cwd !== undefined || input.project !== undefined || wantsWorktree(input)) throw failure('invalid_request', 'A quick thread has no folder, project or worktree')
    return ctx.sessions.quick()
  }

  const open = async (input: StartInput, adopt?: Adopt) => {
    const session = await (input.quick ? quickThread(input) : inFolder(input))
    if (input.title) ctx.sessions.rename(session.id, input.title)
    adopt?.(session)
    receipts.put(input.clientRequestId, session.id)
    return session
  }

  const threadFor = (input: StartInput, adopt?: Adopt) => {
    const known = receipts.get(input.clientRequestId)
    if (known) return Promise.resolve(ctx.sessions.require(known))
    const pending = opening.get(input.clientRequestId) ?? open(input, adopt).finally(() => opening.delete(input.clientRequestId))
    opening.set(input.clientRequestId, pending)
    return pending
  }

  const startOn = async (name: string, input: StartInput, { call, limits }: SubagentStart, inherited: SessionSettings): Promise<Sent> => {
    const pc = pcs.find(name)
    const from = starterOf(input)
    const { cwd, project, title, label, worktree, branch, base, clientRequestId } = input
    const sent = await pcs.start(pc, {
      cwd,
      project,
      title,
      label,
      worktree,
      branch,
      base,
      clientRequestId,
      prompt: owners.sign(input.prompt, from),
      model: input.model ?? inherited.model,
      effort: input.effort ?? inherited.effort,
      speed: input.speed ?? inherited.speed,
      origin: 'agent',
      from: { owner: from.owner, id: from.id },
      subagent: { call, limits },
    })
    starters.put(sent.thread, { ...from, pc }, 'subagent')
    return sent
  }

  const signedHere = ({ prompt, from }: StartInput) => (from?.pc ? prompt : owners.sign(prompt, from))

  return async (input: StartInput, adopt?: Adopt): Promise<Sent> => {
    const { subagent } = input
    const inherited = subagent ? inheritedSettings(ctx, parentOf(ctx, input)) : {}
    if (subagent?.pc) return startOn(subagent.pc, input, subagent, inherited)
    const settings = { ...inherited, ...matchSettings(ctx, input, inherited.model) }
    const prompt = signedHere(input)
    const session = await threadFor(input, subagent ? giveLimits(subagent.limits) : adopt)
    const starter = input.from
    const first = starter !== undefined && starters.put(session.id, starter, input.subagent ? 'subagent' : 'thread')
    if (first && input.subagent) ctx.emit(subagentStarted, session.id, starter)
    const sent = await ctx.turns.send(session, { prompt, label: input.label, origin: input.origin, clientRequestId: input.clientRequestId, settings })
    return { ...sent, thread: session.id }
  }
}

export type Start = ReturnType<typeof createStart>
