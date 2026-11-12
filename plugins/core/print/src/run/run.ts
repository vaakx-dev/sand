import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { cli, CliFlags } from '@sand/config/contract'
import type { Orchestrator, StartInput } from '@sand/orchestrator/contract'
import type { TurnInfo, Turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'
import { createFollower } from '../follow/follower'
import type { Printer } from '../print/printer'
import { followLocal } from './events'

export interface Run {
  threads: Orchestrator
  turns: Turns
  printer: Printer
  prompt: string
  flags: CliFlags
  signal: AbortSignal
}

const startOf = (cwd: string, prompt: string, { model, effort, fast }: CliFlags): StartInput => ({
  cwd,
  prompt,
  model,
  effort,
  ...(fast !== undefined && { speed: fast ? 'fast' : 'normal' }),
  origin: 'print',
  clientRequestId: Bun.randomUUIDv7(),
})

const exitCode = (ended: TurnInfo, signal: AbortSignal) => {
  if (signal.aborted) return 130
  return ended.stopReason === 'refusal' ? 1 : 0
}

export const runPrompt = async (ctx: Context<{ cli: typeof cli }>, { threads, turns, printer, prompt, flags, signal }: Run) => {
  let follower: ReturnType<typeof createFollower> | undefined
  let thread: Session | undefined
  const follow = (session: Session) => {
    thread = session
    follower = createFollower(session.id, printer)
    follower.limits(ctx.get(llm)?.limits?.())
    followLocal(ctx, follower)
  }
  const sent = await threads.start(startOf(ctx.cli.cwd, prompt, flags), follow)
  if (sent.disposition !== 'started' || !thread || !follower) throw new Error('sand could not start a turn for this prompt')
  const stop = () => thread && turns.interrupt(thread)
  signal.addEventListener('abort', stop, { once: true })
  const ended = await turns.wait(sent.turn, 'end')
  signal.removeEventListener('abort', stop)
  await follower.finish(signal)
  return exitCode(ended, signal)
}
