export interface CliFlags {
  continue?: boolean
  resume?: string
  attach?: string[]
  files?: string[]
  model?: string
  effort?: string
  fast?: boolean
  lan?: boolean
  on?: string
  cwd?: string
}

export type CliMode = 'print' | 'serve'

export interface Cli {
  mode: CliMode
  cwd: string
  home: string
  args: string[]
  flags: CliFlags
  prompt?: string
  exit(code?: number): void
}
