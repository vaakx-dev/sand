import type { CommandSpec, KeptCommand } from '@sand/command-keeper/contract'
import { type Dispose, event, service } from 'drydock'

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
  outlives(): boolean
}

export const shellRunner = service<ShellRunner>('shellRunner')

export const shellReady = event<(cwd: string, signal: AbortSignal, progress: (text: string) => void) => Promise<void> | void>('shell.ready')
