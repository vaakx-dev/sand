import type { VersionSource } from '@sand/host-plugin-versions/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import type { DeviceInfo, WireRequest } from '@sand/protocol'
import type { PluginFiles, PluginManifest, PluginSyncState } from './contract'

export interface SyncFile {
  local: string[]
  bases: Record<string, Record<string, string>>
  skipped: Record<string, Record<string, string>>
}

export interface PeerLink {
  list(): Promise<RemoteRecord[]>
  call(record: RemoteRecord, request: WireRequest, timeout?: number): Promise<unknown>
}

export interface PluginSyncOptions {
  home: string
  device: DeviceInfo
  link: PeerLink
  swap(): Promise<boolean>
  changed(state: PluginSyncState): void
  snapshot?(source: VersionSource, plugins: string[]): Promise<void>
}

export interface PluginSync {
  state(): Promise<PluginSyncState>
  exchange(manifest: PluginManifest): Promise<PluginManifest>
  files(plugin: string): Promise<PluginFiles>
  apply(peer: string, plugins: string[]): Promise<PluginSyncState>
  skip(peer: string, plugins: string[]): Promise<PluginSyncState>
  setLocal(plugin: string, local: boolean): Promise<PluginSyncState>
  rescan(): Promise<void>
  round(): Promise<void>
  stop(): void
}
