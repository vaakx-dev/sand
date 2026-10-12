import { parseCommand } from '@sand/kit'
import type { TurnResult } from '@sand/loops/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import { createFollower, type Follower } from '../follow/follower'
import type { Printer } from '../print/printer'
import type { HeadlessUI } from '../ui'
import { runCommand } from './command'
import { followLocal } from './events'
import { localModels } from './models'
import { chooseSession, existingSession } from './session'

export interface Run {
  printer: Printer
  ui: HeadlessUI
  prompt: string
  signal: AbortSignal
}

const exitCode = (result: TurnResult, signal: AbortSignal) => {
  if (signal.aborted) return 130
  return result.stopReason === 'refusal' ? 1 : 0
}

const commandExit = async (follower: Follower, signal: AbortSignal, code: number) => {
  if (follower.turned()) await follower.finish(signal)
  if (signal.aborted) return 130
  return follower.ended()?.stopReason === 'refusal' ? 1 : code
}

const whenAborted = (signal: AbortSignal, stop: () => void) => {
  if (signal.aborted) stop()
  else signal.addEventListener('abort', stop, { once: true })
}

export const runPrompt = async (ctx: Context<'cli' | 'loop' | 'sessions'>, { printer, ui, prompt, signal }: Run) => {
  const queued = () => {
    const thread = ui.thread()
    return thread ? (ctx.backgroundJobs?.queued(thread) ?? 0) : 0
  }
  const follower = createFollower(ui.thread, queued, printer, localModels(ctx))
  follower.limits(ctx.llm?.limits?.())
  followLocal(ctx, follower)
  const focus = <T extends Session | undefined>(session: T) => {
    ui.focus(session)
    const settings = ctx.modelSettings?.flags()
    if (session && settings) ctx.modelSettings?.update(session, settings)
    return session
  }
  whenAborted(signal, () => {
    const focused = ui.service.session()
    if (focused) ctx.loop.interrupt(focused)
  })
  const command = parseCommand(prompt.trim())
  if (command) {
    focus(existingSession(ctx.sessions, ctx.cli))
    signal.throwIfAborted()
    return commandExit(follower, signal, await runCommand(ui, command.name, command.args))
  }
  const session = focus(chooseSession(ctx.sessions, ctx.cli))
  const result = await ctx.loop.run(session, prompt, signal)
  await follower.finish(signal)
  return exitCode(result, signal)
}
