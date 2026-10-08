import type { AnyPlugin } from '../plugin/types'

export interface Mount {
  plugin?: AnyPlugin
  path?: string
  config?: unknown
}
