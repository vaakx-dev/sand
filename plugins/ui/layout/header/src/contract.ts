import { service, type Dispose } from 'drydock'

export type HeaderView = HTMLElement | (() => HTMLElement)

export type HeaderSide = 'start' | 'end'

export interface Header {
  slot(view: HeaderView, order?: number, side?: HeaderSide): Dispose
}

export const header = service<Header>('header')
