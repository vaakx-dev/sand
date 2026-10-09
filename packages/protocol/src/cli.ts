import type { Dispose } from 'drydock'
import type { ServerInfo } from './server'
import type { WireRequest } from './wire'

export interface CliFlags {
  continue?: boolean
  resume?: string
  model?: string
  effort?: string
  fast?: boolean
  cwd?: string
}

export type CliMode = 'print' | 'serve' | 'host' | 'command'

export type CliValues = Record<string, string | boolean | undefined>

export interface Cli {
  mode: CliMode
  cwd: string
  home: string
  builtins: string
  args: string[]
  flags: CliFlags
  prompt?: string
  safe: boolean
  exit(code?: number): void
}

export interface CliCommand {
  name: string
  summary: string
  usage?: string
  options?: string
  run(args: string[], values: CliValues): Promise<number | void> | number | void
}

export interface CliCommands {
  register(command: CliCommand): Dispose
  list(): CliCommand[]
}

export interface DaemonTarget {
  url: string
  key: string
}

export interface DaemonRequestOptions {
  to?: DaemonTarget
  timeout?: number
}

export interface DaemonLaunch {
  info: ServerInfo
  started: boolean
}

export interface Daemon {
  info(): Promise<ServerInfo | undefined>
  require(hint?: string): Promise<ServerInfo>
  ensure(options?: { safe?: boolean }): Promise<DaemonLaunch>
  start(): Promise<ServerInfo>
  stop(): Promise<void>
  request<T = unknown>(request: WireRequest, options?: DaemonRequestOptions): Promise<T>
}

declare module 'drydock' {
  interface Services {
    cliCommands: CliCommands
    daemon: Daemon
  }
}
