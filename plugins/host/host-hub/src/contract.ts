import type { WireEvent, WireHandler, WireRequestType } from '@sand/protocol'
import type { Dispose } from 'drydock'

export interface HubSocket {
  send(data: string): void
  close(): void
}

export interface Hub {
  open(socket: HubSocket, device: string): void
  message(socket: HubSocket, raw: string): void
  close(socket: HubSocket): void
  disconnect(device: string): void
  devices(): string[]
  broadcast(event: WireEvent): void
  handle<K extends WireRequestType>(type: K, handler: WireHandler<K>): Dispose
}

declare module 'drydock' {
  interface Services {
    hub: Hub
  }

  interface Events {
    'hub.open': (device: string) => void
  }
}
