import { llm } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { cli, CliFlags } from '@sand/config/contract'
import { modelSettings } from '@sand/model/contract'
import type { TurnResult, Turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'
import { createFollower } from '../follow/follower'
import type { Printer } from '../print/printer'
import { followLocal } from './events'

export interface Run {
  turns: Turns
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

export const runPrompt = async (ctx: Context<{ cli: typeof cli }>, { turns, sessions, printer, prompt, flags, signal }: Run) => {
  const session = sessions.thread(ctx.cli.cwd)
  const follower = createFollower(session.id, printer)
  follower.limits(ctx.get(llm)?.limits?.())
  followLocal(ctx, follower)
  const settings = ctx.get(modelSettings)
  const chosen = settings?.flags(flags)
  if (chosen) settings?.update(session, chosen)
  const result = await turns.run(session, prompt, { origin: 'print', signal })
  await follower.finish(signal)
  return exitCode(result, signal)
}
