import type { Dispose } from 'drydock'

export interface WebCommand {
  name: string
  title?: string
  description: string
  args?: string
  source?: 'local' | 'server'
  run(args: string): void | Promise<void>
}

export interface Commands {
  add(command: WebCommand): Dispose
  list(): WebCommand[]
  get(name: string): WebCommand | undefined
  run(name: string, args?: string): Promise<boolean>
}

declare module 'drydock' {
  interface Services {
    commands: Commands
  }

  interface Events {
    'commands.change': () => void
  }
}
