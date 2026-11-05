import type { BuildInfo } from '@sand/util/release'
import { service } from 'drydock'

export interface HostBundle {
  build: BuildInfo
  bytes: Uint8Array<ArrayBuffer>
}

export interface HostBuild {
  info(): Promise<BuildInfo>
}

export const hostBuild = service<HostBuild>('hostBuild')
