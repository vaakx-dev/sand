import type { Session } from '@sand/protocol'
import type { Context } from 'drydock'
import { createFollower } from '../follow/follower'
import { commandOf } from '../run/prompt'
import { commandExit, exitCode, whenAborted, type Run } from '../run/run'
import { runCommand } from './command'
import { followLocal } from './events'
import { localModels } from './models'
import { chooseSession, existingSession } from './session'

export type LocalContext = Context<'cli' | 'loop' | 'sessions'>

export const runLocal = async (ctx: LocalContext, { printer, ui, prompt, signal }: Run) => {
  const follower = createFollower(ui.thread, printer, localModels(ctx))
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
  const command = commandOf(prompt)
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
