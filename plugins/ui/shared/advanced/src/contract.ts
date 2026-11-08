import { service } from 'drydock'

/** Whether the user wants advanced controls. Other plugins may read `on()` to reveal them; it's reactive and off by default. */
export interface Advanced {
  on(): boolean
  set(on: boolean): void
}

export const advanced = service<Advanced>('advanced')
