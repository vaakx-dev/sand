import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

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

export const hostVersions = service<HostVersions>('hostVersions')

export const versionsList = request('versions.list', { input: z.object({}), output: type<VersionTarget[]>() })
export const versionsRestore = request('versions.restore', {
  input: z.object({ target: z.string().min(1), version: z.string().min(1) }),
  output: type<VersionTarget>(),
})

export const versionsChange = wireEvent<VersionTarget[]>('versions.change')
