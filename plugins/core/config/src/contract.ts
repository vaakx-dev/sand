import { service } from 'drydock'

export type CliPlace = 'host' | 'runtime' | 'print' | 'cli'

export interface CliFlags {
  model?: string
  effort?: string
  fast?: boolean
}

export type CliValues = Record<string, string | boolean | undefined>

export interface Cli {
  place: CliPlace
  home: string
  cwd: string
  builtins: string
  safe: boolean
  args: string[]
  prompt?: string
  exit(code?: number, afterwards?: () => Promise<void>): void
}

export interface SandConfig {
  path: string
  section(name: string): unknown
}

export const cli = service<Cli>('cli')
export const sandConfig = service<SandConfig>('sandConfig')
