import { llm } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { cli, CliFlags } from '@sand/config/contract'
import type { Loop, TurnResult } from '@sand/loop/contract'
import { modelSettings } from '@sand/model/contract'
import type { Context } from 'drydock'
import { createFollower } from '../follow/follower'
import type { Printer } from '../print/printer'
import { followLocal } from './events'

export interface Run {
  loop: Loop
  sessions: Sessions
  printer: Printer
  prompt: string
  flags: CliFlags
  signal: AbortSignal
}

const exitCode = (result: TurnResult, signal: AbortSignal) => {
  if (signal.aborted) return 130
  return result.stopReason === 'refusal' ? 1 : 0
}

const whenAborted = (signal: AbortSignal, stop: () => void) => {
  if (signal.aborted) stop()
  else signal.addEventListener('abort', stop, { once: true })
}

export const runPrompt = async (ctx: Context<{ cli: typeof cli }>, { loop, sessions, printer, prompt, flags, signal }: Run) => {
  const session = sessions.thread(ctx.cli.cwd)
  const follower = createFollower(session.id, printer)
  follower.limits(ctx.get(llm)?.limits?.())
  followLocal(ctx, follower)
  const settings = ctx.get(modelSettings)
  const chosen = settings?.flags(flags)
  if (chosen) settings?.update(session, chosen)
  whenAborted(signal, () => loop.interrupt(session))
  const result = await loop.run(session, prompt, signal)
  await follower.finish(signal)
  return exitCode(result, signal)
}
