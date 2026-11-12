import { llm } from '@sand/accounts/contract'
import type { Sessions } from '@sand/chats/contract'
import type { cli, CliFlags } from '@sand/config/contract'
import { type Asked, modelSettings } from '@sand/model/contract'
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

const askedOf = ({ model, effort, fast }: CliFlags): Asked => ({ model, effort, ...(fast !== undefined && { speed: fast ? 'fast' : 'normal' }) })

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
  settings?.change(session, settings.match(askedOf(flags)))
  const result = await turns.run(session, prompt, { origin: 'print', signal })
  await follower.finish(signal)
  return exitCode(result, signal)
}
