import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, event, service } from 'drydock'
import { z } from 'zod'
import type { OutputSnapshot } from './output'

export { outputTail, type OutputSnapshot, type OutputTail } from './output'

export interface ShellCommand {
  cwd: string
  signal: AbortSignal
  timeoutMs: number
  onText?: (text: string) => void
}

export interface ShellOutcome {
  code: number
  timedOut: boolean
  stdout: string
  stderr: string
}

export interface CommandSpec {
  id: string
  command: string
  cwd: string
  conversation: string
  label: string
  origin?: string
}

export interface KeptCommand extends CommandSpec {
  pid: number
  started: number
  output: OutputSnapshot
}

export interface ShellProcess {
  exited: Promise<number>
  kill(): Promise<void>
}

export interface ShellRunner {
  name: string
  run(command: string, options: ShellCommand): Promise<ShellOutcome>
  start(spec: CommandSpec, onText: (text: string) => void): ShellProcess
  attach(command: KeptCommand, onText: (text: string) => void): ShellProcess
  follow(found: (command: KeptCommand) => void): Dispose
}

export const shellRunner = service<ShellRunner>('shellRunner')

export const shellReady = event<(cwd: string, signal: AbortSignal, progress: (text: string) => void) => Promise<void> | void>('shell.ready')

export const commandStart = request('shell.command.start', {
  input: () =>
    z.object({
      id: z.string().min(1),
      command: z.string(),
      cwd: z.string(),
      conversation: z.string(),
      label: z.string(),
      origin: z.string().optional(),
      argv: z.array(z.string()).min(1),
      verbatim: z.boolean(),
    }),
  output: type<number>(),
  callers: 'runtime',
})

export const commandsKept = request('shell.commands.kept', { input: () => z.object({}), output: type<KeptCommand[]>(), callers: 'runtime' })

export const commandStop = request('shell.command.stop', { input: () => z.object({ id: z.string() }), output: type<void>(), callers: 'runtime' })

export const commandStarted = wireEvent<KeptCommand>('shell.command.started')

export const commandOutput = wireEvent<{ id: string; text: string }>('shell.command.output')

export const commandExit = wireEvent<{ id: string; code: number }>('shell.command.exit')
