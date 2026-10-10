import type { Status } from 'drydock'

export type ExtensionStatus = 'off' | Status

export interface ExtensionInfo {
  id: string
  name?: string
  description?: string
  label?: string
  summary?: string
  builtin: boolean
  enabled: boolean
  configured: boolean
  bundled: boolean
  status: ExtensionStatus
  error?: string
  provides: string[]
  inject: string[]
  uses: Record<string, string>
  scope?: number
}

export interface Extensions {
  list(): ExtensionInfo[]
  enable(id: string): void
  disable(id: string): void
  reset(): void
  build(): string
}

export interface BrowserState {
  id: string
  status: ExtensionStatus
  error?: string
  missing?: string[]
  inject: string[]
}

export interface WebExtensionState {
  id: string
  dir: string
  label?: string
  summary?: string
  builtin: boolean
  enabled: boolean
  bundled: boolean
  provides: string[]
  problem?: string
  browser?: BrowserState & { at: number }
}

export interface WebExtensions {
  list(): WebExtensionState[]
}

declare module 'drydock' {
  interface Services {
    extensions: Extensions
    webExtensions: WebExtensions
  }

  interface Events {
    'extensions.change': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'web.extensions': {}
    'web.extensions.set': { extension: string; enabled: boolean | null }
    'web.extensions.reset': {}
    'web.extensions.report': { states: BrowserState[] }
  }

  interface WireEvents {
    'web.build': [build: string]
    'web.extensions': [enabled: Record<string, boolean>]
  }
}
