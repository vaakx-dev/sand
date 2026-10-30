import { service } from 'drydock'

export interface BuildInfo {
  id: string
  time: number
  commit?: string
}

export interface BuildChange {
  commit: string
  type: string
  scope?: string
  summary: string
}

export interface HostBundle {
  build: BuildInfo
  bytes: Uint8Array<ArrayBuffer>
}

export interface HostBuild {
  info(): Promise<BuildInfo>
}

export const hostBuild = service<HostBuild>('hostBuild')
