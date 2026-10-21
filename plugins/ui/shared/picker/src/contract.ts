import { service } from 'drydock'

export type PickTone = 'accent' | 'warning' | 'error'

export interface PickItem<T> {
  label: string
  detail?: string
  tone?: PickTone
  value: T
}

export interface Picked<T> {
  value: T
}

export interface Picker {
  choose<T>(title: string, items: PickItem<T>[]): Promise<Picked<T> | undefined>
  input(title: string, value?: string): Promise<string | undefined>
}

export const picker = service<Picker>('picker')
