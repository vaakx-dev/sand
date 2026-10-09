import type { Cli } from './cli'
import type { Runtime } from './runtime'

declare module 'drydock' {
  interface Services {
    cli: Cli
    runtime: Runtime
  }

  interface Events {
    'runtime.drain': () => void
    'runtime.release': (sessions: string[]) => void
  }
}
