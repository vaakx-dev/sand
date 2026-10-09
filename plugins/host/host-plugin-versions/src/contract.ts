export type VersionKind = 'plugin' | 'hook' | 'setting'

export type VersionSource = 'start' | 'edit' | 'customise' | 'restore' | 'sync' | 'auto-restore'

export interface Version {
  id: string
  at: number
  hash: string
  source: VersionSource
  note?: string
}

export interface VersionTarget {
  key: string
  kind: VersionKind
  name: string
  path: string
  exists: boolean
  current?: string
  good?: string
  versions: Version[]
}

export interface HostVersions {
  list(): Promise<VersionTarget[]>
  snapshot(source: VersionSource, keys?: string[]): Promise<void>
  restore(target: string, version: string): Promise<VersionTarget>
  markGood(): Promise<void>
  autoRestore(): Promise<string[]>
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'versions.list': {}
    'versions.restore': { target: string; version: string }
  }

  interface WireEvents {
    'versions.change': [targets: VersionTarget[]]
  }
}

declare module 'drydock' {
  interface Services {
    hostVersions: HostVersions
  }
}
