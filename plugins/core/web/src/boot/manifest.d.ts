declare module 'sand:extensions' {
  import type { AnyPlugin } from 'drydock'

  export interface BundledExtension {
    id: string
    builtin: boolean
    label?: string
    summary?: string
    plugin?: AnyPlugin
  }

  export const problems: string[]
  export const extensions: BundledExtension[]
}
