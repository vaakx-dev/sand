import type { Request } from '@sand/host-hub/contract'
import type { VersionSource } from '@sand/host-plugin-versions/contract'
import type { PluginFiles, PluginManifest, PluginSyncState } from './contract'

export interface SyncFile {
  local: string[]
  bases: Record<string, Record<string, string>>
  skipped: Record<string, Record<string, string>>
}

export interface PeerPc {
  id: string
  name: string
}

export interface PeerLink {
  list(): PeerPc[]
  call<I, O>(pc: PeerPc, request: Request<I, O>, input: I, timeout?: number): Promise<O>
}

export interface PluginSyncOptions {
  home: string
  self: string
  link: PeerLink
  swap(): Promise<boolean>
  changed(state: PluginSyncState): void
  snapshot(source: VersionSource, plugins: string[]): Promise<void>
}

export interface PluginSync {
  state(): Promise<PluginSyncState>
  exchange(manifest: unknown, from: string): Promise<PluginManifest>
  files(plugin: string): Promise<PluginFiles>
  apply(peer: string, plugins: string[]): Promise<PluginSyncState>
  skip(peer: string, plugins: string[]): Promise<PluginSyncState>
  setLocal(plugin: string, local: boolean): Promise<PluginSyncState>
  rescan(): Promise<void>
  round(): Promise<void>
  stop(): void
}
