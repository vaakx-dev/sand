import type { Dispose } from 'drydock'

export interface ShellEnv {
  set(name: string, value: string): Dispose
}

declare module 'drydock' {
  interface Services {
    shellEnv: ShellEnv
  }
}
