import type { DeviceInfo } from '@sand/host-devices/contract'
import type { Request } from '@sand/host-hub/contract'
import type { VersionSource } from '@sand/host-plugin-versions/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import type { PluginFiles, PluginManifest, PluginSyncState } from './contract'

export interface SyncFile {
  local: string[]
  bases: Record<string, Record<string, string>>
  skipped: Record<string, Record<string, string>>
}

export interface PeerLink {
  list(): Promise<RemoteRecord[]>
  call<I, O>(record: RemoteRecord, request: Request<I, O>, input: I, timeout?: number): Promise<O>
}

export interface PluginSyncOptions {
  home: string
  device: DeviceInfo
  link: PeerLink
  swap(): Promise<boolean>
  changed(state: PluginSyncState): void
  snapshot(source: VersionSource, plugins: string[]): Promise<void>
}

export interface PluginSync {
  state(): Promise<PluginSyncState>
  exchange(manifest: unknown): Promise<PluginManifest>
  files(plugin: string): Promise<PluginFiles>
  apply(peer: string, plugins: string[]): Promise<PluginSyncState>
  skip(peer: string, plugins: string[]): Promise<PluginSyncState>
  setLocal(plugin: string, local: boolean): Promise<PluginSyncState>
  rescan(): Promise<void>
  round(): Promise<void>
  stop(): void
}
