import type { Hello, OpenedSession, RemoteClient, TurnResult } from '@sand/protocol'
import type { Context } from 'drydock'
import { createFollower } from '../follow/follower'
import { commandOf, composePrompt } from '../run/prompt'
import { commandExit, exitCode, whenAborted, type Run } from '../run/run'
import { followRemote } from './events'
import { findRemote } from './find'
import { remoteModels } from './models'
import { answerRelay } from './relay'
import { applyFlags, chooseSession, existingSession, remoteFolder } from './session'

const follow = (client: RemoteClient, { printer, ui, signal }: Run, hello: Hello, name: string, opened?: OpenedSession) => {
  ui.track(opened?.info.id)
  const models = remoteModels(hello, opened)
  const follower = createFollower(ui.thread, printer, models, name)
  follower.limits(hello.limits)
  for (const job of hello.jobs) follower.jobStart(job)
  followRemote(client, follower, models)
  const stop = () => {
    const session = ui.thread()
    if (session) void client.call({ type: 'loop.interrupt', session }).catch(() => {})
  }
  whenAborted(signal, stop)
  return follower
}

export const runRemote = async (ctx: Context<'cli'>, run: Run) => {
  const { ui, prompt, signal } = run
  const remote = findRemote(ctx.remotes, ctx.cli.flags.on!)
  const client = await ctx.remotes!.connect(remote)
  try {
    answerRelay(client, ui)
    const hello = await client.call<Hello>({ type: 'hello' })
    const command = commandOf(ctx.cli, prompt)
    if (command) {
      const opened = await existingSession(client, ctx.cli, hello)
      const follower = follow(client, run, hello, remote.name, opened)
      const settings = ctx.modelSettings?.flags()
      if (opened) await applyFlags(client, opened, settings)
      signal.throwIfAborted()
      const target = { session: opened?.info.id, cwd: remoteFolder(ctx.cli, hello), settings }
      const code = await ui.outcome(() => client.call({ type: 'ui.command', ...command, ...target }))
      return await commandExit(follower, signal, code)
    }
    const opened = await chooseSession(client, ctx.cli, hello)
    const follower = follow(client, run, hello, remote.name, opened)
    await applyFlags(client, opened, ctx.modelSettings?.flags())
    const content = await composePrompt(ctx.cli, prompt, ctx.attachments)
    signal.throwIfAborted()
    const result = await client.call<TurnResult>({ type: 'loop.run', session: opened.info.id, prompt: content })
    await follower.finish(signal)
    return exitCode(result, signal)
  } finally {
    client.close()
  }
}
