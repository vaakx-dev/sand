import type { CliValues } from '@sand/config/contract'
import { service, type Dispose } from 'drydock'

export interface CliOption {
  type: 'string' | 'boolean'
  short?: string
  help: string
}

export interface CliCommand {
  name: string
  summary: string
  usage?: string
  options?: Record<string, CliOption>
  default?: boolean
  hidden?: boolean
  run(args: string[], values: CliValues): Promise<number | void> | number | void
}

export interface CliCommands {
  register(command: CliCommand): Dispose
  list(): CliCommand[]
}

export const cliCommands = service<CliCommands>('cliCommands')
