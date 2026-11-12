import type { Session } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import { worktrees } from '@sand/worktrees/contract'
import { existsSync } from 'node:fs'
import type { OrchestratorContext } from './context'
import { failure, type Sent, type StartInput, threadStarted } from './contract'
import type { Owners } from './owners'
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

const parentOf = (ctx: OrchestratorContext, { from }: StartInput) => (from?.owner === 'thread' ? ctx.sessions.open(from.id) : undefined)

const inheritedSettings = (ctx: OrchestratorContext, parent: Session | undefined): SessionSettings => {
  if (!parent) return {}
  const { model, effort, speed } = ctx.modelSettings.effective(parent)
  return { ...(model && { model }), ...(effort && { effort }), speed }
}

export const createStart = (ctx: OrchestratorContext, receipts: Receipts, starters: Starters, owners: Owners) => {
  const opening = new Map<string, Promise<Session>>()

  const placeOf = ({ cwd, project, from }: StartInput) => (cwd === undefined && project === undefined ? { project: owners.home(from) } : { cwd, project })

  const opener = (input: StartInput): Open => {
    const { subagent, from, title } = input
    if (!subagent) return (cwd, project) => ctx.sessions.thread(cwd, project === undefined ? undefined : { project })
    if (!from) throw failure('invalid_request', 'A subagent needs the thread or bot that starts it')
    return (cwd, project) => ctx.sessions.agent({ ...(from.owner === 'thread' && { parent: from.id }), cwd, project, title: title ?? '', origin: subagent.call })
  }

  const folderFor = (input: StartInput) => {
    const parent = input.subagent && input.cwd === undefined && input.project === undefined && parentOf(ctx, input)
    return parent ? { cwd: parent.cwd, project: parent.project } : folderOf(ctx, placeOf(input))
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

  return async (input: StartInput, adopt?: Adopt): Promise<Sent> => {
    const inherited = input.subagent ? inheritedSettings(ctx, parentOf(ctx, input)) : {}
    const settings = { ...inherited, ...matchSettings(ctx, input, inherited.model) }
    const prompt = owners.sign(input.prompt, input.from)
    const session = await threadFor(input, adopt)
    if (input.from && starters.put(session.id, input.from)) ctx.emit(threadStarted, session.id, input.from)
    const sent = await ctx.turns.send(session, { prompt, label: input.label, origin: input.origin, clientRequestId: input.clientRequestId, settings })
    return { ...sent, thread: session.id }
  }
}

export type Start = ReturnType<typeof createStart>
