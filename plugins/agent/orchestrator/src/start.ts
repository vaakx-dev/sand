import type { Session } from '@sand/chats/contract'
import { errorMessage } from '@sand/util'
import { worktrees } from '@sand/worktrees/contract'
import { existsSync } from 'node:fs'
import type { OrchestratorContext } from './context'
import { failure, type Sent, type StartInput, threadStarted } from './contract'
import type { Owners } from './owners'
import type { Receipts } from './receipts'
import type { Starters } from './starters'

const settingsOf = (ctx: OrchestratorContext, { model, effort }: StartInput) => {
  try {
    return ctx.modelSettings.flags({ model, effort })
  } catch (error) {
    throw failure('invalid_request', errorMessage(error))
  }
}

const folderOf = (ctx: OrchestratorContext, { cwd, project }: Pick<StartInput, 'cwd' | 'project'>) => {
  if ((cwd === undefined) === (project === undefined)) throw failure('invalid_request', 'Give either cwd or project')
  if (cwd !== undefined) {
    if (!existsSync(cwd)) throw failure('invalid_request', `${cwd} is not a folder on this PC`)
    return { cwd }
  }
  const copy = ctx.projectFiles.copies().find(candidate => candidate.project === project)
  if (!copy) throw failure('not_found', `Project ${project} has no folder on this PC`)
  return { cwd: copy.path, project: copy.project }
}

const wantsWorktree = ({ worktree, branch, base }: StartInput) => Boolean(worktree || branch || base)

const inWorktree = async (ctx: OrchestratorContext, cwd: string, { branch, base }: StartInput) => {
  const found = ctx.get(worktrees)
  if (!found) throw failure('invalid_request', 'Worktrees are turned off')
  return ctx.sessions.require((await found.thread({ cwd, ...(branch && { branch }), ...(base && { from: base }) })).id)
}

export type Adopt = (session: Session) => void

export const createStart = (ctx: OrchestratorContext, receipts: Receipts, starters: Starters, owners: Owners) => {
  const opening = new Map<string, Promise<Session>>()

  const placeOf = ({ cwd, project, from }: StartInput) => (cwd === undefined && project === undefined ? { project: owners.home(from) } : { cwd, project })

  const open = async (input: StartInput, adopt?: Adopt) => {
    const { cwd, project } = folderOf(ctx, placeOf(input))
    const session = wantsWorktree(input) ? await inWorktree(ctx, cwd, input) : ctx.sessions.thread(cwd, project ? { project } : undefined)
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
    const settings = settingsOf(ctx, input)
    const prompt = owners.sign(input.prompt, input.from)
    const session = await threadFor(input, adopt)
    if (input.from && starters.put(session.id, input.from)) ctx.emit(threadStarted, session.id, input.from)
    const sent = await ctx.turns.send(session, { prompt, origin: input.origin, clientRequestId: input.clientRequestId, ...(settings && { settings }) })
    return { ...sent, thread: session.id }
  }
}

export type Start = ReturnType<typeof createStart>
