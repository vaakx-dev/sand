import type { Session } from '@sand/chats/contract'
import type { TurnOrigin } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import { worktrees } from '@sand/worktrees/contract'
import { existsSync } from 'node:fs'
import type { OrchestratorContext } from './context'
import { failure, type Sent } from './contract'
import type { Receipts } from './receipts'

export interface StartInput {
  cwd?: string
  project?: string
  prompt: string
  title?: string
  model?: string
  effort?: string
  worktree?: boolean
  origin: TurnOrigin
  clientRequestId: string
}

const settingsOf = (ctx: OrchestratorContext, { model, effort }: StartInput) => {
  try {
    return ctx.modelSettings.flags({ model, effort })
  } catch (error) {
    throw failure('invalid_request', errorMessage(error))
  }
}

const folderOf = (ctx: OrchestratorContext, { cwd, project }: StartInput) => {
  if ((cwd === undefined) === (project === undefined)) throw failure('invalid_request', 'Give either cwd or project')
  if (cwd !== undefined) {
    if (!existsSync(cwd)) throw failure('invalid_request', `${cwd} is not a folder on this PC`)
    return { cwd }
  }
  const copy = ctx.projectFiles.copies().find(candidate => candidate.project === project)
  if (!copy) throw failure('not_found', `Project ${project} has no folder on this PC`)
  return { cwd: copy.path, project: copy.project }
}

const inWorktree = async (ctx: OrchestratorContext, cwd: string) => {
  const found = ctx.get(worktrees)
  if (!found) throw failure('invalid_request', 'Worktrees are turned off')
  return ctx.sessions.require((await found.thread({ cwd })).id)
}

export const createStart = (ctx: OrchestratorContext, receipts: Receipts) => {
  const opening = new Map<string, Promise<Session>>()

  const open = async (input: StartInput) => {
    const { cwd, project } = folderOf(ctx, input)
    const session = input.worktree ? await inWorktree(ctx, cwd) : ctx.sessions.thread(cwd, project ? { project } : undefined)
    if (input.title) ctx.sessions.rename(session.id, input.title)
    receipts.put(input.clientRequestId, session.id)
    return session
  }

  const threadFor = (input: StartInput) => {
    const known = receipts.get(input.clientRequestId)
    if (known) return Promise.resolve(ctx.sessions.require(known))
    const pending = opening.get(input.clientRequestId) ?? open(input).finally(() => opening.delete(input.clientRequestId))
    opening.set(input.clientRequestId, pending)
    return pending
  }

  return async (input: StartInput): Promise<Sent> => {
    const settings = settingsOf(ctx, input)
    const session = await threadFor(input)
    const sent = await ctx.turns.send(session, { prompt: input.prompt, origin: input.origin, clientRequestId: input.clientRequestId, ...(settings && { settings }) })
    return { ...sent, thread: session.id }
  }
}

export type Start = ReturnType<typeof createStart>
