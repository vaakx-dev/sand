import {
  commandExit,
  commandOutput,
  commandsHeld,
  commandsKept,
  commandStart,
  commandStarted,
  commandStop,
  type CommandHooks,
  type CommandSpec,
  Keeper,
  type KeptCommand,
  type Launch,
} from '@sand/command-keeper/contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import type { Dispose } from 'drydock'
import type { ShellProcess } from './contract'

interface Keeping {
  start(launch: Launch): Promise<number>
  kept(): Promise<KeptCommand[]>
  stop(id: string): Promise<void>
  outlives(): boolean
  close: Dispose
}

export type OpenKeeping = (hooks: CommandHooks) => Keeping

interface Followed {
  onText(text: string): void
  exited: PromiseWithResolvers<number>
  untrack?: Dispose
}

interface CommandsOptions {
  keeping: OpenKeeping
  track(command: CommandSpec, pid: number): Dispose | undefined
  report(error: unknown): void
}

export const hostKeeping =
  (channel: HostChannel): OpenKeeping =>
  hooks => {
    let held = false
    return {
      start: launch => channel.call(commandStart, launch),
      kept: () => channel.call(commandsKept, {}),
      stop: id => channel.call(commandStop, { id }),
      outlives: () => held,
      close: joinDisposers(
        channel.on(commandStarted, hooks.started),
        channel.on(commandOutput, ({ id, text }) => hooks.output(id, text)),
        channel.on(commandExit, ({ id, code }) => hooks.exit(id, code)),
        channel.on(commandsHeld, () => {
          held = true
        }),
      ),
    }
  }

export const localKeeping: OpenKeeping = hooks => {
  const keeper = new Keeper({ ...hooks, exit: ({ id }, code) => hooks.exit(id, code) })
  return {
    start: async launch => keeper.start(launch),
    kept: async () => keeper.kept(),
    stop: id => keeper.stop(id),
    outlives: () => false,
    close: () => void keeper.close(),
  }
}

export const createCommands = ({ keeping: open, track, report }: CommandsOptions) => {
  const followed = new Map<string, Followed>()
  const finders = new Set<(command: KeptCommand) => void>()

  const ended = (id: string, code: number) => {
    const command = followed.get(id)
    followed.delete(id)
    command?.untrack?.()
    command?.exited.resolve(code)
  }

  const keeping = open({
    started: command => {
      if (!followed.has(command.id)) for (const found of finders) found(command)
    },
    output: (id, text) => followed.get(id)?.onText(text),
    exit: ended,
  })

  const follow = (id: string, onText: (text: string) => void) => {
    const command: Followed = { onText, exited: Promise.withResolvers<number>() }
    followed.set(id, command)
    return command
  }

  const processOf = (id: string, command: Followed): ShellProcess => ({ exited: command.exited.promise, kill: () => keeping.stop(id) })

  return {
    start(launch: Launch, onText: (text: string) => void) {
      const command = follow(launch.id, onText)
      keeping.start(launch).then(
        pid => {
          if (followed.has(launch.id)) command.untrack = track(launch, pid)
        },
        (error: unknown) => {
          followed.delete(launch.id)
          command.exited.reject(error)
        },
      )
      return processOf(launch.id, command)
    },
    attach(kept: KeptCommand, onText: (text: string) => void) {
      const command = follow(kept.id, onText)
      if (kept.code === undefined) command.untrack = track(kept, kept.pid)
      else ended(kept.id, kept.code)
      return processOf(kept.id, command)
    },
    follow(found: (command: KeptCommand) => void) {
      finders.add(found)
      keeping
        .kept()
        .then(commands => commands.filter(command => finders.has(found) && !followed.has(command.id)).forEach(found))
        .catch(report)
      return () => void finders.delete(found)
    },
    outlives: keeping.outlives,
    close: keeping.close,
  }
}

export type Commands = ReturnType<typeof createCommands>
