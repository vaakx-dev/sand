import { service, type Dispose } from 'drydock'

export interface Shortcut {
  key: string
  global?: boolean
  passthrough?: boolean
  when?(event: KeyboardEvent): boolean
  run(): void
}

export interface Keys {
  bind(binding: Shortcut): Dispose
  passthroughKeys(): string[]
  runPassthrough(key: string): void
}

export const keys = service<Keys>('keys')
