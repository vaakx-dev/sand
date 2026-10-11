import type { Dispose } from 'drydock'

export interface Shortcut {
  key: string
  global?: boolean
  run(): void
}

export interface Keys {
  bind(binding: Shortcut): Dispose
}

declare module 'drydock' {
  interface Services {
    keys: Keys
  }
}
