import type { RouteKind } from '@sand/host-gateway/contract'
import type { BuildInfo } from '@sand/protocol'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'unpaired'

export interface ConnectionInfo {
  status: ConnectionStatus
  url?: string
  kind?: RouteKind
  since?: number
  retryAt?: number
  latency?: number
  error?: string
  failedAt?: number
  build?: BuildInfo
}

export interface Machine {
  id: string
  device?: string
  name: string
  local: boolean
  online: boolean
  platform?: string
  address?: string
  build?: BuildInfo
  connection: ConnectionInfo
}

export interface Machines {
  list(): Machine[]
  get(id?: string): Machine | undefined
  name(device?: string): string
  online(device?: string): boolean
  add(link: string): Promise<Machine>
  remove(id: string): Promise<void>
  retry(id?: string): void
}
