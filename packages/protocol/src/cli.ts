export interface CliFlags {
  continue?: boolean
  resume?: string
  model?: string
  effort?: string
  fast?: boolean
  cwd?: string
}

export type CliMode = 'print' | 'serve'

export interface Cli {
  mode: CliMode
  cwd: string
  home: string
  builtins: string
  args: string[]
  flags: CliFlags
  prompt?: string
  exit(code?: number): void
}
