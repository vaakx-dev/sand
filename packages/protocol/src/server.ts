import type { WireRequestOf, WireRequestType } from './wire'

export type DeviceKind = 'pc' | 'phone' | 'browser'

export interface RouteCaller {
  device: string
  name: string
  kind: DeviceKind | 'admin'
}

export type RequestHandler = (request: { type: string } & Record<string, unknown>) => unknown

export type WireHandler<K extends WireRequestType> = (request: WireRequestOf<K>) => unknown

export interface ServerInfo {
  url: string
  urls: string[]
  pid: number
  key: string
}
