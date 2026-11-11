import { service } from 'drydock'

export interface Advanced {
  on(): boolean
  set(on: boolean): void
}

export const advanced = service<Advanced>('advanced')
