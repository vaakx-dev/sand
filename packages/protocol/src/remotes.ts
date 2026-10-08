import type { Dispose } from 'drydock'
import type { WireRequest } from './wire'

export interface DeviceInfo {
  id: string
  name: string
  platform: string
}

export interface Remote extends DeviceInfo {
  url: string
  token: string
}

export interface RemoteClient {
  call<T = unknown>(request: WireRequest): Promise<T>
  listen(handler: (name: string, args: unknown[]) => void): Dispose
  close(): void
}

export interface Remotes {
  device(): DeviceInfo
  list(): Remote[]
  find(name: string): Remote | undefined
  connect(remote: Remote): Promise<RemoteClient>
  add(link: string): Promise<Remote>
  remove(id: string): Promise<void>
}
