import type { PickItem, PickOptions, Picked } from '@sand/server/contract'

export interface Picker {
  choose<T>(title: string, items: PickItem<T>[], options?: PickOptions): Promise<Picked<T> | undefined>
  input(title: string, value?: string): Promise<string | undefined>
}

declare module 'drydock' {
  interface Services {
    picker: Picker
  }
}
