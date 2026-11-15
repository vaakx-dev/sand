import type { HostChannel } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import type { Dispose } from 'drydock'
import { commandExit, commandOutput, commandsKept, commandStart, commandStarted, commandStop, type CommandSpec, type KeptCommand, type ShellProcess } from './contract'
import { type Hooks, Keeper, type Launch } from './keeper'

interface Keeping {
  start(launch: Launch): Promise<number>
  kept(): Promise<KeptCommand[]>
  stop(id: string): Promise<void>
  close: Dispose
}

export type OpenKeeping = (hooks: Hooks) => Keeping

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
  hooks => ({
    start: launch => channel.call(commandStart, launch),
    kept: () => channel.call(commandsKept, {}),
    stop: id => channel.call(commandStop, { id }),
    close: joinDisposers(
      channel.on(commandStarted, hooks.started),
      channel.on(commandOutput, ({ id, text }) => hooks.output(id, text)),
      channel.on(commandExit, ({ id, code }) => hooks.exit(id, code)),
    ),
  })

export const localKeeping: OpenKeeping = hooks => {
  const keeper = new Keeper(hooks)
  return {
    start: async launch => keeper.start(launch),
    kept: async () => keeper.kept(),
    stop: id => keeper.stop(id),
    close: () => keeper.close(),
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
      command.untrack = track(kept, kept.pid)
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
    close: keeping.close,
  }
}

export type Commands = ReturnType<typeof createCommands>
