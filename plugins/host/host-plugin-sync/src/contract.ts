export interface PluginTree {
  hash: string
  files: Record<string, string>
}

export interface PluginManifest {
  device: string
  plugins: Record<string, PluginTree>
  local: string[]
}

export type PluginChangeKind = 'changed' | 'new' | 'removed'

export interface PluginOffer {
  peer: string
  peerName: string
  plugin: string
  kind: PluginChangeKind
  hash: string
  files: number
  both: boolean
}

export interface InstalledPlugin {
  name: string
  files: number
  local: boolean
}

export interface PluginSyncState {
  plugins: InstalledPlugin[]
  offers: PluginOffer[]
}

export interface PluginFile {
  path: string
  data: string
  executable: boolean
}

export interface PluginFiles {
  plugin: string
  hash: string
  files: PluginFile[]
}

export interface HostPluginSync {
  shared(): Promise<string[]>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'plugins.state': {}
    'plugins.apply': { peer: string; plugins: string[] }
    'plugins.skip': { peer: string; plugins: string[] }
    'plugins.local': { plugin: string; local: boolean }
    'plugins.exchange': { manifest: PluginManifest }
    'plugins.files': { plugin: string }
  }

  interface WireEvents {
    'plugins.change': [state: PluginSyncState]
  }
}

declare module 'drydock' {
  interface Services {
    hostPluginSync: HostPluginSync
  }
}
