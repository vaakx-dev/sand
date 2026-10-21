import { event, service } from 'drydock'
import type { OrrinEvent, OrrinProject, OrrinView } from './model'
import type { OrrinInput, OrrinOutput, OrrinRequest } from './requests'

export type * from './model'
export type * from './requests'
export * from './manage'
export * from './setup'

export interface OrrinPlace {
  project: OrrinProject
  view: OrrinView
}

export interface Orrin {
  available(): boolean
  call<R extends OrrinRequest>(request: R, input: OrrinInput<R>, signal?: AbortSignal): Promise<OrrinOutput<R>>
  places(): OrrinPlace[]
  placeAt(path: string): OrrinPlace | undefined
}

export const orrin = service<Orrin>('orrin')

export const orrinChange = event<() => void>('orrin.change')
export const orrinEvent = event<(event: OrrinEvent) => void>('orrin.event')
