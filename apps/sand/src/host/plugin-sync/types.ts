import type { DeviceInfo, PluginFiles, PluginManifest, PluginSyncState, RemoteRecord, WireRequest } from '@sand/protocol'

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
