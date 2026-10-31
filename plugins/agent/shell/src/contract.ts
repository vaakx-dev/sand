import { service } from 'drydock'

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

export interface ShellRunner {
  name: string
  run(command: string, options: ShellCommand): Promise<ShellOutcome>
}

export const shellRunner = service<ShellRunner>('shellRunner')
