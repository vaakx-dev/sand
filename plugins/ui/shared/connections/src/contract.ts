import type { IconName, Tone } from '@sand/ui-kit/contract'
import { service, type Dispose } from 'drydock'

export interface ConnectionAction {
  label: string
  primary?: boolean
  run(): void
}

export interface ConnectionState {
  tone: Tone
  status: string
  busy?: boolean
  error?: string
  actions: ConnectionAction[]
}

export interface Connection {
  id: string
  name: string
  icon: IconName
  order?: number
  state(): ConnectionState
}

export interface Connections {
  add(connection: Connection): Dispose
}

export const connections = service<Connections>('connections')
