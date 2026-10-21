import { service, type Dispose } from 'drydock'

export interface Shortcut {
  key: string
  global?: boolean
  when?(event: KeyboardEvent): boolean
  run(): void
}

export interface Keys {
  bind(binding: Shortcut): Dispose
}

export const keys = service<Keys>('keys')
