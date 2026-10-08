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
