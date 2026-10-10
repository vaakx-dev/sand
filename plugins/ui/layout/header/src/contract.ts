import type { Dispose } from 'drydock'

export type HeaderView = HTMLElement | (() => HTMLElement)

export interface Header {
  slot(view: HeaderView, order?: number): Dispose
}

declare module 'drydock' {
  interface Services {
    header: Header
  }
}
