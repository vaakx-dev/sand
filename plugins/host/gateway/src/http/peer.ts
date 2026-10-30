import type { SocketData } from '../listen'
import type { Source } from '../listener/reach'

export interface Peer {
  address?: string
  upgrade(data: SocketData): boolean
}

export interface Visitor extends Peer {
  source: Source
}

export type Reply = Response | Promise<Response> | undefined
